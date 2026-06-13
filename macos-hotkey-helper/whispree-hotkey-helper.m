#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>
#import <Foundation/Foundation.h>

static void Emit(NSString *type, NSString *detail) {
  NSMutableDictionary *payload = [@{ @"type": type } mutableCopy];
  if (detail) payload[@"detail"] = detail;
  NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
  if (!data) return;
  fwrite(data.bytes, 1, data.length, stdout);
  fputc('\n', stdout);
  fflush(stdout);
}

typedef NS_ENUM(NSInteger, ShortcutKind) { ShortcutKindCombo, ShortcutKindModifierOnly };

typedef struct {
  ShortcutKind kind;
  int keyCode;
  NSEventModifierFlags modifiers;
} HotkeyShortcut;

static NSDictionary<NSString *, NSNumber *> *KeyCodeMap(void) {
  static NSDictionary<NSString *, NSNumber *> *map;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    map = @{
      @"a": @0, @"s": @1, @"d": @2, @"f": @3, @"h": @4, @"g": @5, @"z": @6, @"x": @7,
      @"c": @8, @"v": @9, @"b": @11, @"q": @12, @"w": @13, @"e": @14, @"r": @15, @"y": @16,
      @"t": @17, @"1": @18, @"2": @19, @"3": @20, @"4": @21, @"6": @22, @"5": @23, @"=": @24,
      @"9": @25, @"7": @26, @"-": @27, @"8": @28, @"0": @29, @"]": @30, @"o": @31, @"u": @32,
      @"[": @33, @"i": @34, @"p": @35, @"l": @37, @"j": @38, @"'": @39, @"k": @40, @";": @41,
      @"\\": @42, @",": @43, @"/": @44, @"n": @45, @"m": @46, @".": @47, @"space": @49,
      @"esc": @53, @"escape": @53, @"return": @36, @"enter": @36, @"tab": @48,
      @"left": @123, @"right": @124, @"down": @125, @"up": @126,
      @"leftoption": @58, @"option": @58, @"leftcontrol": @59, @"control": @59,
      @"leftcommand": @55, @"command": @55, @"leftshift": @56, @"shift": @56, @"fn": @63
    };
  });
  return map;
}

static BOOL IsModifierKeyCode(int keyCode) {
  switch (keyCode) {
    case 58: case 61: case 59: case 62: case 55: case 54: case 56: case 60: case 63: return YES;
    default: return NO;
  }
}

static NSEventModifierFlags ModifierFlagMaskForKeyCode(int keyCode) {
  switch (keyCode) {
    case 58: case 61: return NSEventModifierFlagOption;
    case 59: case 62: return NSEventModifierFlagControl;
    case 55: case 54: return NSEventModifierFlagCommand;
    case 56: case 60: return NSEventModifierFlagShift;
    default: return 0;
  }
}

static BOOL IsDeviceSpecificBitSet(int keyCode, uint64_t flagsRaw) {
  switch (keyCode) {
    case 58: return (flagsRaw & 0x20) != 0;
    case 61: return (flagsRaw & 0x40) != 0;
    case 59: return (flagsRaw & 0x01) != 0;
    case 62: return (flagsRaw & 0x2000) != 0;
    case 55: return (flagsRaw & 0x08) != 0;
    case 54: return (flagsRaw & 0x10) != 0;
    case 56: return (flagsRaw & 0x02) != 0;
    case 60: return (flagsRaw & 0x04) != 0;
    case 63: return (flagsRaw & 0x00800000) != 0;
    default: return NO;
  }
}

static BOOL ParseShortcut(NSString *label, HotkeyShortcut *outShortcut) {
  NSString *normalized = [label stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
  NSEventModifierFlags modifiers = 0;
  if ([normalized containsString:@"⌘"]) modifiers |= NSEventModifierFlagCommand;
  if ([normalized containsString:@"⌃"]) modifiers |= NSEventModifierFlagControl;
  if ([normalized containsString:@"⇧"]) modifiers |= NSEventModifierFlagShift;
  if ([normalized containsString:@"⌥"]) modifiers |= NSEventModifierFlagOption;

  NSString *keyPart = normalized;
  for (NSString *token in @[ @"⌘", @"⌃", @"⇧", @"⌥", @"+" ]) {
    keyPart = [keyPart stringByReplacingOccurrencesOfString:token withString:@""];
  }
  keyPart = [[keyPart stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet] lowercaseString];

  if (keyPart.length == 0) {
    if (modifiers == NSEventModifierFlagOption) { *outShortcut = (HotkeyShortcut){ ShortcutKindModifierOnly, 58, 0 }; return YES; }
    if (modifiers == NSEventModifierFlagControl) { *outShortcut = (HotkeyShortcut){ ShortcutKindModifierOnly, 59, 0 }; return YES; }
    if (modifiers == NSEventModifierFlagCommand) { *outShortcut = (HotkeyShortcut){ ShortcutKindModifierOnly, 55, 0 }; return YES; }
    if (modifiers == NSEventModifierFlagShift) { *outShortcut = (HotkeyShortcut){ ShortcutKindModifierOnly, 56, 0 }; return YES; }
    return NO;
  }

  NSNumber *keyCodeNumber = KeyCodeMap()[keyPart];
  if (!keyCodeNumber) return NO;
  int keyCode = keyCodeNumber.intValue;
  if (modifiers == 0 && IsModifierKeyCode(keyCode)) {
    *outShortcut = (HotkeyShortcut){ ShortcutKindModifierOnly, keyCode, 0 };
    return YES;
  }
  if (modifiers == 0) return NO;
  *outShortcut = (HotkeyShortcut){ ShortcutKindCombo, keyCode, modifiers };
  return YES;
}

static CGEventRef HotkeyCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *userInfo);

@interface HotkeyTap : NSObject
@property(nonatomic, assign) HotkeyShortcut shortcut;
@property(nonatomic, assign) CFMachPortRef eventTap;
@property(nonatomic, assign) CFRunLoopSourceRef runLoopSource;
@property(nonatomic, assign) BOOL comboIsDown;
@property(nonatomic, assign) BOOL modifierIsDown;
@end

@implementation HotkeyTap

- (instancetype)initWithShortcut:(HotkeyShortcut)shortcut {
  self = [super init];
  if (self) _shortcut = shortcut;
  return self;
}

- (BOOL)start {
  if (!AXIsProcessTrusted()) {
    Emit(@"error", @"Accessibility permission is required for the macOS CGEventTap hotkey helper.");
    return NO;
  }
  CGEventMask mask = (1ULL << kCGEventKeyDown) | (1ULL << kCGEventKeyUp) | (1ULL << kCGEventFlagsChanged) |
                     (1ULL << kCGEventTapDisabledByTimeout) | (1ULL << kCGEventTapDisabledByUserInput);
  self.eventTap = CGEventTapCreate(kCGHIDEventTap, kCGHeadInsertEventTap, kCGEventTapOptionDefault, mask, HotkeyCallback, (__bridge void *)self);
  if (!self.eventTap) {
    Emit(@"error", @"Unable to create CGEventTap.");
    return NO;
  }
  self.runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, self.eventTap, 0);
  CFRunLoopAddSource(CFRunLoopGetCurrent(), self.runLoopSource, kCFRunLoopCommonModes);
  CGEventTapEnable(self.eventTap, true);
  Emit(@"ready", nil);
  return YES;
}

- (CGEventRef)handleType:(CGEventType)type event:(CGEventRef)event {
  if (type == kCGEventTapDisabledByTimeout || type == kCGEventTapDisabledByUserInput) {
    if (self.eventTap) CGEventTapEnable(self.eventTap, true);
    return event;
  }

  int keyCode = (int)CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
  uint64_t flagsRaw = CGEventGetFlags(event);
  NSEventModifierFlags modifiers = ((NSEventModifierFlags)flagsRaw) & (NSEventModifierFlagCommand | NSEventModifierFlagOption | NSEventModifierFlagControl | NSEventModifierFlagShift);

  if (self.shortcut.kind == ShortcutKindCombo) {
    if (type != kCGEventKeyDown && type != kCGEventKeyUp) return event;
    if (keyCode != self.shortcut.keyCode || modifiers != self.shortcut.modifiers) return event;
    if (type == kCGEventKeyDown) {
      BOOL repeat = CGEventGetIntegerValueField(event, kCGKeyboardEventAutorepeat) != 0;
      if (!self.comboIsDown && !repeat) {
        self.comboIsDown = YES;
        Emit(@"pressed", nil);
      }
    } else if (self.comboIsDown) {
      self.comboIsDown = NO;
      Emit(@"released", nil);
    }
    return NULL;
  }

  if (type != kCGEventFlagsChanged) return event;
  BOOL sideBitSet = IsDeviceSpecificBitSet(self.shortcut.keyCode, flagsRaw);
  if (self.modifierIsDown) {
    if (!sideBitSet) {
      self.modifierIsDown = NO;
      Emit(@"released", nil);
    }
  } else if (sideBitSet && keyCode == self.shortcut.keyCode && [self isOnlyTargetModifierActive:flagsRaw]) {
    self.modifierIsDown = YES;
    Emit(@"pressed", nil);
  }
  return event;
}

- (BOOL)isOnlyTargetModifierActive:(uint64_t)flagsRaw {
  NSEventModifierFlags modifiers = ((NSEventModifierFlags)flagsRaw) & (NSEventModifierFlagCommand | NSEventModifierFlagOption | NSEventModifierFlagControl | NSEventModifierFlagShift);
  if (self.shortcut.keyCode == 63) return modifiers == 0 && (flagsRaw & 0x00800000) != 0;
  return modifiers == ModifierFlagMaskForKeyCode(self.shortcut.keyCode);
}

@end

static CGEventRef HotkeyCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *userInfo) {
  (void)proxy;
  HotkeyTap *tap = (__bridge HotkeyTap *)userInfo;
  return [tap handleType:type event:event];
}

static NSString *ShortcutArgument(int argc, const char *argv[]) {
  for (int i = 1; i < argc - 1; i++) {
    if (strcmp(argv[i], "--shortcut") == 0) return [NSString stringWithUTF8String:argv[i + 1]];
  }
  return nil;
}

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    NSString *label = ShortcutArgument(argc, argv);
    HotkeyShortcut shortcut;
    if (!label || !ParseShortcut(label, &shortcut)) {
      Emit(@"error", @"Usage: whispree-hotkey-helper --shortcut <Swift label, e.g. ⌃⇧R>");
      return 64;
    }
    HotkeyTap *tap = [[HotkeyTap alloc] initWithShortcut:shortcut];
    if (![tap start]) return 2;
    CFRunLoopRun();
  }
  return 0;
}

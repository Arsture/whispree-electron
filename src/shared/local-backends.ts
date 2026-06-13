import { localModelBackendRegistry, type LocalModelBackend, type LocalModelCapability, type ProviderPlatform } from './providers';

export function localBackendsForPlatform(platform: ProviderPlatform, capability?: LocalModelCapability): readonly LocalModelBackend[] {
  return localModelBackendRegistry.filter((backend) => {
    const platformMatches = backend.descriptor.platform === platform || backend.descriptor.platform === 'cross-platform';
    const capabilityMatches = capability ? backend.capabilities.includes(capability) : true;
    return platformMatches && capabilityMatches;
  });
}

export function backendReadinessSummary(platform: ProviderPlatform): { readonly total: number; readonly planned: number; readonly notTested: number; readonly unsupported: number } {
  const backends = localBackendsForPlatform(platform);
  return {
    total: backends.length,
    planned: backends.filter((backend) => backend.descriptor.status === 'planned').length,
    notTested: backends.filter((backend) => backend.descriptor.status === 'not-tested').length,
    unsupported: backends.filter((backend) => backend.descriptor.status === 'unsupported').length,
  };
}

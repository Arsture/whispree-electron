import { useEffect, useState } from 'react';
import { initialAppSnapshot, type AppSnapshot } from '../../shared/ipc';

export function useAppSnapshot(): AppSnapshot {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(initialAppSnapshot);

  useEffect(() => {
    let mounted = true;
    void window.whispree.getAppSnapshot().then((nextSnapshot) => {
      if (mounted) setSnapshot(nextSnapshot);
    });
    const unsubscribe = window.whispree.subscribeAppSnapshot((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return snapshot;
}

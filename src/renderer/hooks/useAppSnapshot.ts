import { useEffect, useState } from 'react';
import { initialAppSnapshot, type AppSnapshot } from '../../shared/ipc';

export interface UseAppSnapshotResult {
  readonly snapshot: AppSnapshot;
  readonly isLoaded: boolean;
}

export function useAppSnapshot(): UseAppSnapshotResult {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(initialAppSnapshot);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void window.whispree.getAppSnapshot().then((nextSnapshot) => {
      if (mounted) {
        setSnapshot(nextSnapshot);
        setLoaded(true);
      }
    });
    const unsubscribe = window.whispree.subscribeAppSnapshot((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setLoaded(true);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { snapshot, isLoaded };
}

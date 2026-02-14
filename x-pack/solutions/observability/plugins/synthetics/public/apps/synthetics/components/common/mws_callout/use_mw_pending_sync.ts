/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectDynamicSettings } from '../../../state/settings/selectors';
import { getDynamicSettingsAction } from '../../../state/settings/actions';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants/settings_defaults';

const STORAGE_KEY = 'synthetics.mwPendingSync';

interface PendingSyncEntry {
  detectedAt: number;
  syncInterval: number;
}

const readEntry = (): PendingSyncEntry | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PendingSyncEntry;
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

const writeEntry = (entry: PendingSyncEntry) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
};

const clearEntry = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

/*
 * Hook that detects when active maintenance windows disappear (deleted or deactivated)
 * while monitors still reference them, and persists the pending-sync state in
 * sessionStorage.
 */
export const useMwPendingSync = ({
  activeIdsKey,
  hasMonitorMWs,
}: {
  activeIdsKey: string;
  hasMonitorMWs: boolean;
}) => {
  const dispatch = useDispatch();
  const { settings } = useSelector(selectDynamicSettings);

  useEffect(() => {
    if (!settings) {
      dispatch(getDynamicSettingsAction.get());
    }
  }, [dispatch, settings]);

  const syncInterval =
    settings?.privateLocationsSyncInterval ??
    DYNAMIC_SETTINGS_DEFAULTS.privateLocationsSyncInterval ??
    5;

  const [showPendingSync, setShowPendingSync] = useState<boolean>(() => {
    if (activeIdsKey) return false;
    const entry = readEntry();
    if (entry) {
      const elapsed = Date.now() - entry.detectedAt;
      const ttl = entry.syncInterval * 60 * 1000;
      return elapsed < ttl;
    }
    return false;
  });

  const prevActiveIdsKeyRef = useRef<string>(activeIdsKey);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (!activeIdsKey) {
      const entry = readEntry();
      if (entry) {
        const elapsed = Date.now() - entry.detectedAt;
        const ttl = entry.syncInterval * 60 * 1000;
        const remaining = ttl - elapsed;
        if (remaining > 0) {
          setShowPendingSync(true);
          timerRef.current = setTimeout(() => {
            setShowPendingSync(false);
            clearEntry();
          }, remaining);
        } else {
          clearEntry();
          setShowPendingSync(false);
        }
      }
    }
    return clearTimer;
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prevKey = prevActiveIdsKeyRef.current;
    const currentKey = activeIdsKey;

    if (prevKey && !currentKey && hasMonitorMWs) {
      const entry: PendingSyncEntry = { detectedAt: Date.now(), syncInterval };
      writeEntry(entry);
      setShowPendingSync(true);
      clearTimer();
      timerRef.current = setTimeout(() => {
        setShowPendingSync(false);
        clearEntry();
      }, syncInterval * 60 * 1000);
    } else if (currentKey) {
      setShowPendingSync(false);
      clearTimer();
      clearEntry();
    }

    prevActiveIdsKeyRef.current = currentKey;

    return clearTimer;
  }, [activeIdsKey, hasMonitorMWs, syncInterval, clearTimer]);

  return { showPendingSync, syncInterval };
};

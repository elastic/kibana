/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { USER_SETTINGS_KEYS } from '../../../common/user_settings/keys';
import { useKibana } from '../lib/kibana';
import { useUserSetting } from './use_user_setting';

type TableConfigurations = Record<string, string>;

const EMPTY_CONFIGURATIONS: TableConfigurations = {};

const readLegacy = (id: string): string | null => {
  try {
    return window.localStorage.getItem(id);
  } catch {
    return null;
  }
};

const removeLegacy = (id: string): void => {
  try {
    window.localStorage.removeItem(id);
  } catch {
    // storage may be unavailable (private mode, blocked): nothing to clean up
  }
};

/**
 * POC: `configurationStorage` for the response-ops alerts table, persisted per user.
 *
 * The table reads its saved configuration synchronously on first render and serializes it to a JSON
 * string per table id, so this adapter stores a map of table id -> that string under one preloaded
 * User Storage key.
 *
 * - `get`: the User Storage value, else the legacy `localStorage` entry for the same id (read-through).
 * - `set` / `remove`: write through the queue and delete the legacy entry, so the configuration
 *   moves to the server the first time the user changes it.
 *
 * Removal writes an empty string (tombstone) instead of dropping the id: the server merges map
 * values deeply on update, so an omitted id would survive and come back after a reload.
 *
 * The returned object is referentially stable: the table lists it in the dependencies of its save
 * callback, and an unstable storage would trigger redundant saves. Latest state is read via refs.
 *
 * Returns `undefined` when the session has no profile, so the table keeps its default
 * `localStorage` behaviour.
 */
export const useAlertsTableConfigurationStorage = (): IStorageWrapper | undefined => {
  const { userStorage } = useKibana().services;
  const available = userStorage.isAvailable();

  const [configurations, setConfigurations] = useUserSetting<TableConfigurations>(
    USER_SETTINGS_KEYS.ALERTS_TABLE_COLUMNS,
    EMPTY_CONFIGURATIONS
  );

  const configurationsRef = useRef(configurations);
  const setConfigurationsRef = useRef(setConfigurations);
  useEffect(() => {
    configurationsRef.current = configurations;
    setConfigurationsRef.current = setConfigurations;
  });
  // also keep the ref current during render, so a read in the same render pass is not stale
  configurationsRef.current = configurations;

  return useMemo<IStorageWrapper | undefined>(() => {
    if (!available) return undefined;

    return {
      get: <T>(id: string) => {
        const saved = configurationsRef.current[id];
        if (saved) return saved as T;
        // tombstone: the configuration was reset, do not resurrect the legacy value
        if (saved === '') return null as T;
        return readLegacy(id) as T;
      },
      set: <T>(id: string, value: T) => {
        setConfigurationsRef.current((previous) => ({ ...previous, [id]: value as string }));
        removeLegacy(id);
      },
      remove: (id: string) => {
        setConfigurationsRef.current((previous) => ({ ...previous, [id]: '' }));
        removeLegacy(id);
      },
      clear: () => {
        setConfigurationsRef.current((previous) =>
          Object.fromEntries(Object.keys(previous).map((id) => [id, '']))
        );
      },
    };
  }, [available]);
};

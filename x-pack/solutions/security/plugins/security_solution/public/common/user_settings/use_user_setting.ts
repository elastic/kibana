/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { isEqual } from 'lodash';
import { Subject, merge, filter, map } from 'rxjs';
import type { HttpStart } from '@kbn/core-http-browser';
import type { IUserStorageClient } from '@kbn/core-user-storage-browser';
import type { UserSettingsKey } from '../../../common/user_settings/keys';
import { useKibana } from '../lib/kibana';
import { UserSettingsWriteQueue } from './write_queue';

/** One queue per client, so every hook instance in the page shares the same single writer. */
const queues = new WeakMap<IUserStorageClient, UserSettingsWriteQueue>();

const USER_STORAGE_PATH = '/internal/user_storage';

const getQueue = (client: IUserStorageClient, http: HttpStart): UserSettingsWriteQueue => {
  const existing = queues.get(client);
  if (existing) return existing;

  const queue = new UserSettingsWriteQueue(client);
  queues.set(client, queue);
  // Values a previous page (for example one that was just reloaded) did not get to save.
  if (client.isAvailable()) queue.replayOutbox();

  if (typeof document !== 'undefined') {
    // Tab hidden (switched away or closing): send what is pending now.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void queue.flush();
    });
    // Page unload (reload, navigation, close): a regular request would be cancelled, so resend the
    // unsaved values with `keepalive`. The writes are idempotent, so overlapping a request that was
    // already in flight is harmless.
    window.addEventListener('pagehide', () => {
      queue.getUnsaved().forEach(([key, value]) => {
        http
          .put(`${USER_STORAGE_PATH}/${encodeURIComponent(key)}`, {
            body: JSON.stringify({ value }),
            keepalive: true,
          })
          .catch(() => {});
      });
    });
  }
  return queue;
};

/** Session without a profile (API key, anonymous): values live in localStorage only. */
const LOCAL_FALLBACK_PREFIX = 'securitySolution.userSettings.local.';

/** Emits the key of every fallback write, so hooks re-render (the write queue is not involved). */
const localChanges$ = new Subject<string>();

interface UseUserSettingOptions {
  /**
   * localStorage key this setting used before, holding a value of the same shape. Until the server
   * has a value, the legacy value is returned and imported once (and the legacy key removed).
   */
  legacyLocalStorageKey?: string;
}

type UserSettingSetter<T> = (next: T | ((previous: T) => T)) => void;

/**
 * POC replacement for `localStorage` reads/writes of UI preferences.
 *
 * Reading is synchronous for `preload: true` keys, otherwise the default is returned until the
 * lazy fetch finishes. Writing updates the returned value immediately and persists in the
 * background through a single-writer queue (see `write_queue.ts`).
 */
export const useUserSetting = <T>(
  key: UserSettingsKey,
  defaultValue: T,
  { legacyLocalStorageKey }: UseUserSettingOptions = {}
): [T, UserSettingSetter<T>] => {
  const { userStorage, storage, http } = useKibana().services;
  const queue = useMemo(() => getQueue(userStorage, http), [userStorage, http]);
  const available = userStorage.isAvailable();

  const defaultRef = useRef(defaultValue);
  if (!isEqual(defaultRef.current, defaultValue)) defaultRef.current = defaultValue;
  const stableDefault = defaultRef.current;

  // The legacy value is read once per mount. It stays the user's value until the server has one,
  // so a first render after the migration does not start from the default.
  const legacyRef = useRef<T | null | undefined>(undefined);
  if (legacyRef.current === undefined) {
    legacyRef.current = legacyLocalStorageKey ? storage.get(legacyLocalStorageKey) : null;
  }

  const read = useCallback((): T => {
    const legacy = legacyRef.current ?? undefined;
    if (!available) {
      return storage.get(LOCAL_FALLBACK_PREFIX + key) ?? legacy ?? stableDefault;
    }
    const pending = queue.getPending<T>(key);
    if (pending !== undefined) return pending;
    // the real client returns the default itself; `?? stableDefault` also covers `peek` mocks that don't
    const server = userStorage.peek<T>(key, stableDefault) ?? stableDefault;
    return legacy !== undefined && isEqual(server, stableDefault) ? legacy : server;
  }, [available, key, queue, stableDefault, storage, userStorage]);

  const value$ = useMemo(
    () =>
      merge(
        userStorage.get$<T>(key, stableDefault),
        queue.changes$.pipe(filter((changed) => changed === key)),
        localChanges$.pipe(filter((changed) => changed === key))
      ).pipe(map(read)),
    [key, queue, read, stableDefault, userStorage]
  );
  const value = useObservable(value$, read());

  // One-time legacy import, after the server value is known (also covers non-preloaded keys).
  useEffect(() => {
    // nothing to import when no legacy value existed at mount (the common case after migration)
    if (!available || !legacyLocalStorageKey || legacyRef.current == null) return;
    let cancelled = false;

    userStorage
      .get<T>(key, stableDefault)
      .then((serverValue) => {
        if (
          cancelled ||
          !isEqual(serverValue, stableDefault) ||
          queue.getPending(key) !== undefined
        )
          return;
        const imported: T | null = storage.get(legacyLocalStorageKey);
        if (imported == null) return;
        if (!isEqual(imported, stableDefault)) queue.enqueue(key, imported);
        storage.remove(legacyLocalStorageKey);
        legacyRef.current = null;
      })
      // read failures are reported by the core client on getHttpError$; keep the legacy value
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [available, key, legacyLocalStorageKey, queue, stableDefault, storage, userStorage]);

  const setValue = useCallback<UserSettingSetter<T>>(
    (next) => {
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(read()) : next;
      legacyRef.current = null;
      if (!available) {
        storage.set(LOCAL_FALLBACK_PREFIX + key, resolved);
        localChanges$.next(key);
        return;
      }
      queue.enqueue(key, resolved);
    },
    [available, key, queue, read, storage]
  );

  return [value, setValue];
};

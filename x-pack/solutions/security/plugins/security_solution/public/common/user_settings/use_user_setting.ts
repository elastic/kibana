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
import type { IUserStorageClient } from '@kbn/core-user-storage-browser';
import type { UserSettingsKey } from '../../../common/user_settings/keys';
import { useKibana } from '../lib/kibana';
import { UserSettingsWriteQueue } from './write_queue';

/** One queue per client, so every hook instance in the page shares the same single writer. */
const queues = new WeakMap<IUserStorageClient, UserSettingsWriteQueue>();

const getQueue = (client: IUserStorageClient): UserSettingsWriteQueue => {
  const existing = queues.get(client);
  if (existing) return existing;

  const queue = new UserSettingsWriteQueue({ writer: client });
  queues.set(client, queue);

  // Best effort flush when the tab is hidden or closed. A keepalive request is a follow-up
  // (the core client does not expose one), so this only helps when the tab stays alive long enough.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void queue.flush();
    });
  }
  return queue;
};

/** Session without a profile (API key, anonymous): values live in localStorage only. */
const LOCAL_FALLBACK_PREFIX = 'securitySolution.userSettings.local.';

/** Emits the key of every fallback write, so hooks re-render (the write queue is not involved). */
const localChanges$ = new Subject<string>();

export interface UseUserSettingOptions<T> {
  /**
   * localStorage key this setting used before. When the server has no value yet, the legacy
   * value is imported once (and the legacy key removed).
   */
  legacyLocalStorageKey?: string;
  /** Maps the raw legacy value to the new shape. Return `undefined` to skip the import. */
  fromLegacy?: (raw: unknown) => T | undefined;
}

export type UserSettingSetter<T> = (next: T | ((previous: T) => T)) => void;

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
  { legacyLocalStorageKey, fromLegacy }: UseUserSettingOptions<T> = {}
): [T, UserSettingSetter<T>] => {
  const { userStorage, storage } = useKibana().services;
  const queue = useMemo(() => getQueue(userStorage), [userStorage]);
  const available = userStorage.isAvailable();

  const defaultRef = useRef(defaultValue);
  if (!isEqual(defaultRef.current, defaultValue)) defaultRef.current = defaultValue;
  const stableDefault = defaultRef.current;

  const read = useCallback((): T => {
    if (!available) {
      const local = storage.get(LOCAL_FALLBACK_PREFIX + key);
      if (local != null) return local as T;
      // no profile: the legacy value is still the user's value, keep reading it
      const legacy = legacyLocalStorageKey ? storage.get(legacyLocalStorageKey) : null;
      if (legacy != null) {
        const mapped = fromLegacy ? fromLegacy(legacy) : (legacy as T);
        if (mapped !== undefined) return mapped;
      }
      return stableDefault;
    }
    const pending = queue.getPending<T>(key);
    if (pending !== undefined) return pending;
    // the real client returns the default itself; `?? stableDefault` also covers `peek` mocks that don't
    return userStorage.peek<T>(key, stableDefault) ?? stableDefault;
  }, [
    available,
    fromLegacy,
    key,
    legacyLocalStorageKey,
    queue,
    stableDefault,
    storage,
    userStorage,
  ]);

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
    if (!available || !legacyLocalStorageKey) return;
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
        const raw = storage.get(legacyLocalStorageKey);
        if (raw == null) return;
        const imported = fromLegacy ? fromLegacy(raw) : (raw as T);
        if (imported !== undefined && !isEqual(imported, stableDefault)) {
          queue.enqueue(key, imported);
        }
        storage.remove(legacyLocalStorageKey);
      })
      // read failures are reported by the core client on getHttpError$; keep the legacy value
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    available,
    fromLegacy,
    key,
    legacyLocalStorageKey,
    queue,
    stableDefault,
    storage,
    userStorage,
  ]);

  const setValue = useCallback<UserSettingSetter<T>>(
    (next) => {
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(read()) : next;
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

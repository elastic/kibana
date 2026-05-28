/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dedup cache for the v2 attack-details flyout's `useTimelineEventsDetails`
 * call.
 *
 * ## Why
 *
 * The flyout's header, footer, and body each consume attack-discovery data
 * through `useAttackDetails`. Without dedup, every consumer that mounts
 * with the same `(indexName, attackId)` would issue its own request via
 * `useTimelineEventsDetails` (which fires a fresh search every time `skip`
 * is `false`). This cache lets all consumers for the same key share a
 * single fetch.
 *
 * ## How
 *
 * For each key, one mounted hook is elected the **primary** — it runs
 * `useTimelineEventsDetails({ skip: false })` and publishes the result as
 * a snapshot to the cache. Every other hook for the same key is a
 * **secondary**: it calls `useTimelineEventsDetails({ skip: true })` and
 * reads the primary's snapshot during render.
 *
 * Primary election is implicit. Subscribers live in an insertion-ordered
 * Map and the first key is the primary; adding a subscriber to a
 * non-empty Map makes them a secondary, and deleting the current primary
 * automatically promotes the next-in-order. Secondaries are woken on
 * snapshot publish or primary handoff via React's `useSyncExternalStore`,
 * driven by a monotonic `version` counter (snapshot identity alone would
 * miss handoff, since handoff doesn't change the snapshot but still needs
 * to re-render the new primary so it switches to `skip: false`).
 *
 * Cache entries are removed the moment their last subscriber unmounts, so
 * the long-session footprint is bounded by the number of currently-open
 * flyouts, not the number ever opened.
 */

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import type { SearchHit } from '../../../../../common/search_strategy';

/** Subset of the `useTimelineEventsDetails` result that consumers share. */
export interface AttackDetailsSnapshot {
  loading: boolean;
  searchHit: SearchHit | undefined;
  refetch: () => Promise<void>;
}

const buildCacheKey = (indexName: string, attackId: string): string | null =>
  indexName && attackId ? `${indexName}:${attackId}` : null;

interface CacheEntry {
  /** Insertion-ordered; the first key is the primary subscriber. */
  subscribers: Map<number, () => void>;
  snapshot: AttackDetailsSnapshot | null;
  version: number;
}

const cache = new Map<string, CacheEntry>();
let nextSubscriberId = 1;
const noop = (): void => {};

const getOrCreateEntry = (cacheKey: string): CacheEntry => {
  let entry = cache.get(cacheKey);
  if (!entry) {
    entry = { subscribers: new Map(), snapshot: null, version: 0 };
    cache.set(cacheKey, entry);
  }
  return entry;
};

const getPrimaryId = (entry: CacheEntry): number | undefined =>
  entry.subscribers.keys().next().value;

const notifyAll = (entry: CacheEntry, exceptSubscriberId?: number): void => {
  entry.version += 1;
  entry.subscribers.forEach((notify, id) => {
    if (id !== exceptSubscriberId) {
      notify();
    }
  });
};

// Render-time slot reservation. `useSyncExternalStore.subscribe` runs at
// commit, which is too late to drive `skip` on the first render — so the
// consumer reserves its slot here, and the commit-time subscribe patches
// in the real notify callback.
const claimSubscriberSlot = (cacheKey: string, subscriberId: number): void => {
  const entry = getOrCreateEntry(cacheKey);
  if (!entry.subscribers.has(subscriberId)) {
    entry.subscribers.set(subscriberId, noop);
  }
};

const subscribeToEntry = (
  cacheKey: string,
  subscriberId: number,
  notify: () => void
): (() => void) => {
  const entry = getOrCreateEntry(cacheKey);
  entry.subscribers.set(subscriberId, notify);

  return () => {
    const e = cache.get(cacheKey);
    if (!e) {
      return;
    }

    const wasPrimary = getPrimaryId(e) === subscriberId;
    e.subscribers.delete(subscriberId);

    if (e.subscribers.size === 0) {
      cache.delete(cacheKey);
      return;
    }

    if (wasPrimary) {
      notifyAll(e);
    }
  };
};

const isPrimarySubscriber = (cacheKey: string, subscriberId: number): boolean => {
  const entry = cache.get(cacheKey);
  return entry !== undefined && getPrimaryId(entry) === subscriberId;
};

const getSnapshotVersion = (cacheKey: string): number => cache.get(cacheKey)?.version ?? 0;

const getCachedSnapshot = (cacheKey: string): AttackDetailsSnapshot | null =>
  cache.get(cacheKey)?.snapshot ?? null;

const writeSnapshot = (
  cacheKey: string,
  publisherId: number,
  snapshot: AttackDetailsSnapshot
): void => {
  const entry = cache.get(cacheKey);
  if (!entry || getPrimaryId(entry) !== publisherId) {
    return;
  }
  entry.snapshot = snapshot;
  // Skip the publisher: it already has these values locally, so a
  // self-notify would just cause a redundant re-render.
  notifyAll(entry, publisherId);
};

export interface AttackDetailsSubscription {
  /** `true` if this hook owns the fetch for `cacheKey` (or `cacheKey` is `null`). */
  isPrimary: boolean;
  /** Latest snapshot published by the primary; `null` for primaries / before first publish. */
  cachedSnapshot: AttackDetailsSnapshot | null;
  /** Called by the primary in an effect to share its latest values. */
  publishSnapshot: (snapshot: AttackDetailsSnapshot) => void;
}

/**
 * React entry point to the cache. When either `indexName` or `attackId` is
 * empty, the caller opts out of dedup and sees itself as the sole primary
 * with an empty snapshot and a no-op publish.
 */
export const useAttackDetailsSubscription = (
  indexName: string,
  attackId: string
): AttackDetailsSubscription => {
  const cacheKey = buildCacheKey(indexName, attackId);
  const [subscriberId] = useState(() => nextSubscriberId++);

  const lastClaimedKeyRef = useRef<string | null>(null);
  if (lastClaimedKeyRef.current !== cacheKey) {
    if (cacheKey !== null) {
      claimSubscriberSlot(cacheKey, subscriberId);
    }
    lastClaimedKeyRef.current = cacheKey;
  }

  const subscribe = useCallback(
    (notify: () => void): (() => void) =>
      cacheKey !== null ? subscribeToEntry(cacheKey, subscriberId, notify) : noop,
    [cacheKey, subscriberId]
  );

  const getSnapshot = useCallback(
    () => (cacheKey !== null ? getSnapshotVersion(cacheKey) : 0),
    [cacheKey]
  );

  useSyncExternalStore(subscribe, getSnapshot);

  const isPrimary = cacheKey === null || isPrimarySubscriber(cacheKey, subscriberId);
  const cachedSnapshot = cacheKey !== null && !isPrimary ? getCachedSnapshot(cacheKey) : null;

  const publishSnapshot = useCallback(
    (snapshot: AttackDetailsSnapshot): void => {
      if (cacheKey === null) {
        return;
      }
      writeSnapshot(cacheKey, subscriberId, snapshot);
    },
    [cacheKey, subscriberId]
  );

  return { isPrimary, cachedSnapshot, publishSnapshot };
};

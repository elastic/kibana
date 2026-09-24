/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cross-boundary signal for triggering React Query invalidation after assignee mutations.
 *
 * The flyout and queue rows live in separate React roots with isolated QueryClients,
 * so cache invalidation cannot cross that boundary directly. This module-level store
 * acts as a pure signal: calling `bump(conversationId)` increments a version counter
 * for that conversation and notifies every subscriber. Subscribers (pages and the
 * ConnectedAssignees flyout slot) watch the snapshot via `useSyncExternalStore` and
 * react by invalidating their local React Query cache, which triggers a refetch.
 *
 * No UIDs are stored here — the store is stateless with respect to assignee data.
 */

type Listener = () => void;

const _versions = new Map<string, number>();
const _listeners = new Set<Listener>();

/**
 * Stable snapshot reference. `useSyncExternalStore` requires `getSnapshot` to return
 * the same reference between calls unless the store changed, so we only replace it
 * inside `notify()`.
 */
let _snapshot: ReadonlyMap<string, number> = new Map();

function notify() {
  _snapshot = new Map(_versions);
  _listeners.forEach((fn) => fn());
}

export const assigneeSignal = {
  /**
   * Increment the version counter for a conversation.
   * Every subscriber re-renders and can compare its previous snapshot to detect the bump.
   */
  bump(conversationId: string): void {
    _versions.set(conversationId, (_versions.get(conversationId) ?? 0) + 1);
    notify();
  },

  /**
   * Subscribe to store changes.
   * Pass this to `useSyncExternalStore` as the first argument.
   */
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },

  /**
   * Return the current snapshot (conversationId → version counter).
   * Pass this to `useSyncExternalStore` as the second argument.
   * The reference is stable between bumps so React skips unnecessary re-renders.
   */
  getSnapshot(): ReadonlyMap<string, number> {
    return _snapshot;
  },
};

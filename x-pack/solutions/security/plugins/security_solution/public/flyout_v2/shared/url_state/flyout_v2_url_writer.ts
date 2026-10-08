/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { encode } from '@kbn/rison';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { FlyoutDescriptor, FlyoutV2UrlParamValue } from './flyout_v2_url_param';
import { decodeFlyoutV2UrlParam } from './flyout_v2_url_param';

// ---------------------------------------------------------------------------
// Generation tracking (cascade-close guard)
// ---------------------------------------------------------------------------

/**
 * Monotonic counter bumped by every `writeOnOpen` call. Module-scoped (not a useRef) so that
 * `buildOnClose` can compare at call time vs. at invocation time — detecting whether any newer
 * open superseded the current one after `buildOnClose` was created.
 *
 * Keyed by `urlParamKey` to isolate the page-flyout context (flyoutV2) from the Timeline-flyout
 * context (flyoutV2Timeline). A new open in context A does NOT invalidate a pending close in
 * context B.
 *
 * This is the "cascade-close" guard: EUI fires `onClose` on a genuine close AND on a
 * cascade-eviction (a deeper flyout evicting the current slot occupant). Naive pop-on-close
 * corrupts the stack; the generation check lets the returned `onClose` ignore evictions.
 */
const writeGenerations: Record<string, number> = {};

/**
 * Stack of write-generations currently believed to be "open" for a given `urlParamKey`, mirroring
 * the shape of the URL array: index 0 is the root (session:'start'), index 1 is the child
 * (session:'inherit'). Capped at 2 entries, same as the URL itself.
 *
 * The generation guard alone is not sufficient: when a root flyout with an open child is closed
 * as a whole (e.g. the tools flyout AND its child both dismissed together), EUI fires the CHILD's
 * onClose first (cascade), then the ROOT's own onClose second — but the root's write generation
 * is older than the child's, so the plain "am I the most recent write" check would wrongly treat
 * the root's onClose as a stale eviction and swallow it, leaving the child's `[root]` revert-write
 * as the final (wrong) URL state instead of the root's own `null` (fully cleared) write.
 *
 * This stack lets `buildOnClose` ask the more precise question: "is anything with a newer
 * generation than mine STILL open?" A 'start' write resets the stack to `[gen]` (discarding stale
 * entries, mirroring how it discards the stale URL chain too), which also self-heals any entry
 * that never got popped (e.g. a flyout unmounted through a path that skipped `onClose`).
 */
const openGenerationStacks: Record<string, number[]> = {};

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface FlyoutUrlWriter {
  /**
   * Call when a flyout opens. Records the descriptor in the URL param.
   *
   * `mode = 'start'` (default): replaces the URL array with `[descriptor]`.
   *   Use for session:'start' opens — any existing chain is cleared.
   * `mode = 'inherit'`: appends `descriptor` to the current URL array (capped at 2).
   *   Use for session:'inherit' / `...AsChild` opens so the restore array contains
   *   both the parent (index 0) and the child (index 1).
   */
  writeOnOpen: (descriptor: FlyoutDescriptor, mode?: 'start' | 'inherit') => void;
  /**
   * Call right after `writeOnOpen` to build the `onClose` callback for `openSystemFlyout`.
   *
   * The returned callback writes `[fallback]` (or clears the param if `fallback` is `null`)
   * unless something with a newer generation is still open — that would mean this close is a
   * cascade-eviction side effect, and writing would clobber the newer descriptor. When the newer
   * open has ALSO since closed (e.g. a root closing together with its already-cascaded child),
   * the write goes through even though this generation is no longer the most recent one.
   */
  buildOnClose: (fallback: FlyoutDescriptor | null) => () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Shared write-side helper for keeping the `flyoutV2` (or `flyoutV2Timeline`) URL param in sync
 * with whichever flyout chain is currently open.
 *
 * Parameterized by `(urlParamKey, historyKey)` so the page-flyout context and the
 * Timeline-flyout context are two independent instantiations of the same mechanism.
 *
 * Creates `createKbnUrlStateStorage` (following the legacy expandable-flyout pattern) and
 * exposes it for use by the restore hook (T-003). Writes use `history.replace` (never `push`)
 * to avoid creating extra Back/Forward stops.
 *
 * Degrades to a no-op when `history` lacks `location`/`replace` (many unit tests pass a
 * minimal history object).
 */
export const useFlyoutV2UrlWriter = (
  urlParamKey: string,
  // historyKey is not used internally for URL writes but is part of the contract: callers
  // instantiate one writer per context (page vs. Timeline) and pass the matching historyKey
  // so the restore hook (T-003) can identify which EUI flyout chain to restore into.
  _historyKey: symbol
): FlyoutUrlWriter => {
  const history = useHistory();
  const hasUsableHistory = !!history?.location && typeof history.replace === 'function';

  // createKbnUrlStateStorage is the Kibana-standard URL state layer used by the legacy
  // expandable-flyout package. We create it here (a) for consistency with that pattern,
  // (b) so the restore hook (T-003) can share the same storage instance when reading back
  // on mount via `change$` / `get`. Write-side uses direct history.replace (synchronous)
  // so tests can assert the URL immediately without waiting on microtask batching.
  const urlStorage = useMemo(() => {
    if (!hasUsableHistory) return null;
    try {
      return createKbnUrlStateStorage({ useHash: false, useHashQuery: false, history });
    } catch {
      return null;
    }
  }, [hasUsableHistory, history]);

  // Reads the current URL stack, preferring the pending (unflushed) value in urlStorage
  // so 'inherit' appends are consistent even when urlStorage has buffered an update.
  const readCurrentStack = useCallback((): FlyoutV2UrlParamValue => {
    const pending = urlStorage?.get<FlyoutV2UrlParamValue>(urlParamKey);
    if (pending) return pending;
    const raw = new URLSearchParams(history.location.search).get(urlParamKey);
    return decodeFlyoutV2UrlParam(raw) ?? [];
  }, [urlStorage, urlParamKey, history]);

  // Writes directly via history.replace so the URL update is synchronous.
  // Using history.replace (not push) means no extra Back/Forward stops are created.
  const writeToUrl = useCallback(
    (stack: FlyoutV2UrlParamValue | null) => {
      if (!hasUsableHistory) return;
      const params = new URLSearchParams(history.location.search);
      if (stack && stack.length > 0) {
        params.set(urlParamKey, encode(stack));
      } else {
        params.delete(urlParamKey);
      }
      const serialized = params.toString();
      history.replace({ ...history.location, search: serialized ? `?${serialized}` : '' });
    },
    [hasUsableHistory, history, urlParamKey]
  );

  const writeOnOpen = useCallback(
    (descriptor: FlyoutDescriptor, mode: 'start' | 'inherit' = 'start') => {
      if (!hasUsableHistory) return;
      const generation = (writeGenerations[urlParamKey] ?? 0) + 1;
      writeGenerations[urlParamKey] = generation;

      if (mode === 'inherit') {
        // A child open keeps the session-start root (index 0) and sets the child slot to the new
        // descriptor — REPLACING any existing child. A child opened from within another child
        // (e.g. tool -> document -> host) must persist as [root, currentDeepestChild]; appending and
        // slicing to 2 would instead keep the stale first two entries and drop the newest child (the
        // one the user is actually looking at).
        const [root] = readCurrentStack();
        writeToUrl(root ? [root, descriptor] : [descriptor]);
        // Keep the root's generation (index 0), replace the child's (index 1) — mirrors the URL.
        const [rootGeneration] = openGenerationStacks[urlParamKey] ?? [];
        openGenerationStacks[urlParamKey] = [rootGeneration ?? generation, generation];
      } else {
        // A 'start' open is a new top-level flyout; discard any existing chain.
        writeToUrl([descriptor]);
        openGenerationStacks[urlParamKey] = [generation];
      }
    },
    [hasUsableHistory, urlParamKey, readCurrentStack, writeToUrl]
  );

  const buildOnClose = useCallback(
    (fallback: FlyoutDescriptor | null): (() => void) => {
      if (!hasUsableHistory) return () => {};
      const ownGeneration = writeGenerations[urlParamKey] ?? 0;
      return () => {
        const stack = openGenerationStacks[urlParamKey] ?? [];
        const ownIndex = stack.indexOf(ownGeneration);
        if (ownIndex !== -1) stack.splice(ownIndex, 1);

        // If something with a newer generation is STILL open, this close is a cascade-eviction
        // side effect — do NOT overwrite the newer descriptor with this, now-stale, fallback.
        const hasNewerStillOpen = stack.some((openGeneration) => openGeneration > ownGeneration);
        if (hasNewerStillOpen) return;

        writeToUrl(fallback ? [fallback] : null);
      };
    },
    [hasUsableHistory, urlParamKey, writeToUrl]
  );

  return useMemo(() => ({ writeOnOpen, buildOnClose }), [writeOnOpen, buildOnClose]);
};

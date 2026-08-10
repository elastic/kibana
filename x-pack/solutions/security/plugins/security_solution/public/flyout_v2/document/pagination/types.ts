/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { FlyoutOrigin } from '../../../common/lib/telemetry';

/**
 * Per-source-instance pagination slice. Each mounted source (alerts table,
 * timeline data table, etc.) owns exactly one slice, keyed by a UUID that
 * it mints at mount time. The shape is intentionally flat and immutable so
 * that `useSyncExternalStore` consumers get a new reference on every
 * mutation and re-render reliably.
 */
export interface ScopedPaginationSlice {
  /**
   * Absolute index (across all pages / loaded rows) of the document
   * currently shown in the flyout, or `null` when no document is expanded.
   * Drives `activePage` of the in-flyout `EuiPagination`.
   */
  readonly flyoutDocumentIndex: number | null;
  /** Current page size of the response-ops alerts table (alerts table only). */
  readonly pageSize: number;
  /**
   * Total number of documents in the source's loaded set. Drives
   * `pageCount` of the in-flyout `EuiPagination`.
   */
  readonly totalDocumentCount: number;
  /**
   * `true` while the document at `flyoutDocumentIndex` belongs to a different page
   * than the table is currently displaying and is being fetched. Consumers
   * should render a centered loading spinner instead of stale document content.
   */
  readonly isFlyoutDocumentLoading: boolean;
  /**
   * Resolved document at `flyoutDocumentIndex`, or `null` while no document is
   * expanded. Alerts and Timeline events share this representation.
   */
  readonly flyoutDocument: DataTableRecord | null;
  /**
   * Implementation registered by the source that opens (or swaps) the
   * document-details flyout for a given absolute index. Lives in the store
   * rather than a React ref so that V2 flyout content mounted in a separate
   * React root via `overlays.openSystemFlyout` can still dispatch.
   *
   * `null` when no implementation is registered; callers treat that as a
   * no-op.
   */
  readonly openDocumentFlyoutImpl: ((documentIndex: number) => void) | null;
}

/**
 * Sentinel returned when the requested slice id is `null`, `undefined`, or
 * unknown. Consumers that receive this value render no pagination.
 * Exporting it lets consumers compare by identity instead of by value.
 */
export const absentSlice: ScopedPaginationSlice = {
  flyoutDocumentIndex: null,
  pageSize: 0,
  totalDocumentCount: 0,
  isFlyoutDocumentLoading: false,
  flyoutDocument: null,
  openDocumentFlyoutImpl: null,
};

/**
 * Value exposed by `useFlyoutPagination`. Extends `ScopedPaginationSlice`
 * with a stable `openDocumentFlyout` wrapper that dispatches through the
 * registered `openDocumentFlyoutImpl`.
 */
export interface FlyoutPaginationValue extends ScopedPaginationSlice {
  /**
   * Stable wrapper around the slice's `openDocumentFlyoutImpl`. Calling this
   * from the in-flyout `EuiPagination` is the single dispatch path for
   * swapping the displayed document. No-ops when the slice has no registered
   * implementation or when `instanceId` is absent.
   */
  readonly openDocumentFlyout: (documentIndex: number) => void;
}

/**
 * Options for the `usePaginatedFlyout` writer hook.
 *
 * Only source-specific values are required here. V2 system-flyout
 * infrastructure is resolved internally.
 */
export interface UsePaginatedFlyoutOptions {
  /**
   * Resolves the document at the given absolute index from the source's
   * current in-memory data. Returns slice fields to update, or `null` when the
   * document is on a different page and is not yet in memory. The hook writes
   * `flyoutDocumentIndex`
   * (showing a loading state) and the source's cross-page resolution effect
   * should call `openPaginatedFlyout` again once the fetch completes.
   */
  readonly resolveDocument?: (documentIndex: number) => Partial<ScopedPaginationSlice> | null;
  /**
   * Factory that creates the flyout body element. The store is provided to the
   * body via `PaginationStoreProvider` by the hook before opening the flyout.
   */
  readonly renderBody: () => React.ReactNode;
  /** History key for the V2 system flyout session. Must be a Symbol as required by the overlays API. */
  readonly historyKey: symbol;
  /** Which top-level UI opened the paginated document flyout. */
  readonly origin: FlyoutOrigin;
  /** Optional callback invoked when the V2 system flyout is closed externally. */
  readonly onClose?: () => void;
}

/**
 * Values returned by `usePaginatedFlyout`.
 */
export interface UsePaginatedFlyoutReturn {
  /**
   * Current snapshot of this source's pagination slice, subscribed via
   * `useSyncExternalStore`. Includes the stable `openDocumentFlyout` wrapper.
   * Re-renders only when this source's slice changes.
   */
  readonly slice: FlyoutPaginationValue;
  /**
   * Stable callback that opens (or navigates) the paginated flyout to the
   * given absolute document index. Exposed so consumers (e.g. `ActionsCell`)
   * can trigger navigation without accessing the store directly.
   */
  readonly openDocumentFlyout: (documentIndex: number) => void;
  /**
   * Merge a partial update into this source's pagination slice. Routed through
   * the hook so the source never touches the store directly.
   */
  readonly setState: (partial: Partial<ScopedPaginationSlice>) => void;
  /**
   * Open (or navigate) the paginated flyout to `documentIndex`.
   *
   * - Always sets `flyoutDocumentIndex` in the slice.
   * Opens the V2 system flyout on the first call; subsequent calls just
   * update the slice so the body re-renders from the store.
   */
  readonly openPaginatedFlyout: (
    documentIndex: number,
    explicitStateUpdate?: Partial<ScopedPaginationSlice>
  ) => void;
  /**
   * Soft-reset this source's pagination slice (clear displayed-document
   * fields: `flyoutDocumentIndex`, `flyoutDocument`, and
   * `isFlyoutDocumentLoading`) and close any open V2 system
   * flyout. The slice itself is NOT removed — `openDocumentFlyoutImpl` and
   * `pageSize` survive so the source can call `openPaginatedFlyout` again
   * without re-registering. Full slice removal on unmount is auto-handled by
   * the hook.
   */
  readonly closePaginatedFlyout: () => void;
}

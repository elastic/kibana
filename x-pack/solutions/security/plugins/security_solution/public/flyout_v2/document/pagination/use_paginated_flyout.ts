/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { flyoutPaginationStore } from './store';
import { useFlyoutPagination } from './use_flyout_pagination';
import { useDefaultDocumentFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../../shared/hooks/use_open_flyout';
import { FLYOUT_SESSION_KIND, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../../common/lib/telemetry';
import type {
  ScopedPaginationSlice,
  UsePaginatedFlyoutOptions,
  UsePaginatedFlyoutReturn,
} from './types';

/**
 * Soft-reset payload applied by `closePaginatedFlyout` and the V2 internal
 * `onClose`. Clears every displayed-document field without removing the slice,
 * so that the registered `openDocumentFlyoutImpl` and `pageSize` survive across
 * open/close cycles. The `Partial<ScopedPaginationSlice>` annotation surfaces
 * a compile-time error if a future field addition needs to be handled here.
 */
const SOFT_RESET: Partial<ScopedPaginationSlice> = {
  flyoutDocumentIndex: null,
  flyoutDocument: null,
  isFlyoutDocumentLoading: false,
};

/**
 * Writer hook for paginated flyout sources (alerts table, timeline).
 *
 * Responsibilities:
 * - Mints a stable per-source-instance UUID at mount.
 * - Subscribes to its own slice via `useFlyoutPagination` and returns it as
 *   `slice`.
 * - Exposes `setState` so the source can write to the slice without touching
 *   `flyoutPaginationStore` directly.
 * - Manages the V2 system flyout lifecycle: opens it once on the first
 *   `openPaginatedFlyout` call and reuses it; auto-closes on unmount.
 * - Registers `openDocumentFlyoutImpl` in the slice so the in-flyout
 *   `EuiPagination` can dispatch back through `openPaginatedFlyout`.
 * - Auto-removes the slice on unmount.
 *
 * Sources MUST NOT call `flyoutPaginationStore.setSlice` / `removeSlice` or
 * the flyout open APIs directly. All writes go through `setState` /
 * `openPaginatedFlyout` / `closePaginatedFlyout`.
 */
export const usePaginatedFlyout = ({
  resolveDocument,
  renderBody,
  historyKey,
  origin,
  onClose,
}: UsePaginatedFlyoutOptions): UsePaginatedFlyoutReturn => {
  // Stable id: minted once at mount, never changes. Using a ref ensures the
  // id survives re-renders and is serialisable into V2 system flyout params
  // (unlike React's `useId` which is only stable within the same React tree).
  const paginationInstanceId = useRef(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  ).current;

  const openFlyout = useOpenFlyout();
  const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

  // Tracks the currently-open V2 system flyout overlay so we can reuse it
  // across subsequent `openPaginatedFlyout` calls.
  const v2OverlayRef = useRef<OverlayRef | null>(null);

  // `resolveDocument` closes over mutable React state (e.g. tableContext,
  // tablePageIndex) and will always change identity when that state updates —
  // even when correctly memoized by the caller. Reading it through a ref lets
  // `openPaginatedFlyout` (and its useEffect registration) stay stable without
  // capturing a stale closure. This is the same pattern as React's proposed
  // `useEffectEvent`.
  const resolveDocumentRef = useRef(resolveDocument);
  resolveDocumentRef.current = resolveDocument;

  // Bundle mutable values used inside `openPaginatedFlyout` into a single ref
  // so the callback can remain stable without capturing stale closures.
  const infraRef = useRef({
    openFlyout,
    defaultFlyoutProperties,
    renderBody,
    origin,
    onClose,
  });
  infraRef.current = {
    openFlyout,
    defaultFlyoutProperties,
    renderBody,
    origin,
    onClose,
  };

  // Subscribe to this source's own slice (read path). The returned value
  // includes the stable `openDocumentFlyout` wrapper for in-flyout EuiPagination.
  const slice = useFlyoutPagination(paginationInstanceId);

  const setState = useCallback((partial: Partial<ScopedPaginationSlice>): void => {
    flyoutPaginationStore.setSlice(paginationInstanceId, partial);
    // paginationInstanceId is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closePaginatedFlyout = useCallback((): void => {
    // Soft-reset: clear displayed-document fields but keep the slice alive so
    // that the `openDocumentFlyoutImpl` registered at mount survives and can be
    // used again on the next open. Real teardown (removeSlice) happens only on
    // the hook's unmount cleanup effect.
    flyoutPaginationStore.setSlice(paginationInstanceId, SOFT_RESET);
    if (v2OverlayRef.current) {
      v2OverlayRef.current.close();
      v2OverlayRef.current = null;
    }
    // paginationInstanceId is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPaginatedFlyout = useCallback(
    (documentIndex: number, explicitStateUpdate?: Partial<ScopedPaginationSlice>): void => {
      const stateUpdate =
        explicitStateUpdate ?? resolveDocumentRef.current?.(documentIndex) ?? null;

      flyoutPaginationStore.setSlice(paginationInstanceId, {
        flyoutDocumentIndex: documentIndex,
        ...(stateUpdate ?? {}),
      });

      // The pagination feature only targets the V2 system flyout.
      if (v2OverlayRef.current) return;
      const {
        openFlyout: infraOpenFlyout,
        defaultFlyoutProperties: infraDefaultProps,
        renderBody: infraRenderBody,
        origin: infraOrigin,
        onClose: infraOnClose,
      } = infraRef.current;
      v2OverlayRef.current = infraOpenFlyout(
        infraRenderBody(paginationInstanceId),
        {
          ...infraDefaultProps,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          onClose: (flyout: OverlayRef) => {
            flyout.close();
            v2OverlayRef.current = null;
            flyoutPaginationStore.setSlice(paginationInstanceId, SOFT_RESET);
            infraOnClose?.();
          },
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin: infraOrigin,
        }
      );
    },
    // paginationInstanceId and historyKey are stable. Mutable values are read
    // through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyKey]
  );

  // Register `openDocumentFlyoutImpl` in the slice so the in-flyout
  // `EuiPagination` (which calls `useFlyoutPagination.openDocumentFlyout`) can
  // dispatch back through `openPaginatedFlyout`.
  useEffect(() => {
    flyoutPaginationStore.setSlice(paginationInstanceId, {
      openDocumentFlyoutImpl: (documentIndex: number) => openPaginatedFlyout(documentIndex),
    });
    return () => {
      flyoutPaginationStore.setSlice(paginationInstanceId, { openDocumentFlyoutImpl: null });
    };
    // paginationInstanceId is stable; openPaginatedFlyout is stable for the
    // hook's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPaginatedFlyout]);

  // Auto-remove the slice and close the V2 overlay on unmount. This is the
  // cleanest lifecycle path: navigation away from the source page fires
  // the cleanup before any other effects, so downstream consumers don't see
  // stale state.
  useEffect(() => {
    return () => {
      flyoutPaginationStore.removeSlice(paginationInstanceId);
      if (v2OverlayRef.current) {
        v2OverlayRef.current.close();
        v2OverlayRef.current = null;
      }
    };
    // paginationInstanceId is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    paginationInstanceId,
    slice,
    setState,
    openPaginatedFlyout,
    closePaginatedFlyout,
  };
};

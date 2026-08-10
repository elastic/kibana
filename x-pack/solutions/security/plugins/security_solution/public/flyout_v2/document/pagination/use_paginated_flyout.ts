/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { createPaginationStore } from './store';
import { PaginationStoreProvider } from './context';
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
 * `onClose`. Clears every displayed-document field without touching the store
 * instance, so that the registered `openDocumentFlyoutImpl` survives across
 * open/close cycles.
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
 * - Creates an isolated per-instance `PaginationStore` in a ref.
 * - Subscribes to that store directly (source lives outside the provider).
 * - Wraps the flyout body in `<PaginationStoreProvider>` before opening.
 * - Manages the V2 system flyout lifecycle.
 * - Registers `openDocumentFlyoutImpl` in the store.
 * - Exposes `openDocumentFlyout` so consumers can dispatch opens without
 *   touching the store directly.
 */
export const usePaginatedFlyout = ({
  resolveDocument,
  renderBody,
  historyKey,
  origin,
  onClose,
}: UsePaginatedFlyoutOptions): UsePaginatedFlyoutReturn => {
  // Per-instance store created once at mount. Lives in a ref so it never
  // changes identity and its subscribe/getSnapshot are stable.
  const storeRef = useRef(createPaginationStore());

  // Subscribe directly (not via context) because this hook runs in the source
  // tree, outside any PaginationStoreProvider.
  const rawSlice = useSyncExternalStore(
    storeRef.current.subscribe,
    storeRef.current.getSnapshot,
    storeRef.current.getSnapshot
  );

  const openFlyout = useOpenFlyout();
  const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const v2OverlayRef = useRef<OverlayRef | null>(null);

  // `resolveDocument` closes over mutable React state and will change identity
  // on every render. Reading through a ref lets the stable `openPaginatedFlyout`
  // always call the latest version.
  const resolveDocumentRef = useRef(resolveDocument);
  resolveDocumentRef.current = resolveDocument;

  // Bundle mutable infra values so the stable `openPaginatedFlyout` never
  // captures a stale closure.
  const infraRef = useRef({ openFlyout, defaultFlyoutProperties, renderBody, origin, onClose });
  infraRef.current = { openFlyout, defaultFlyoutProperties, renderBody, origin, onClose };

  const setState = useCallback((partial: Partial<ScopedPaginationSlice>): void => {
    storeRef.current.setState(partial);
    // storeRef.current is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closePaginatedFlyout = useCallback((): void => {
    storeRef.current.setState(SOFT_RESET);
    if (v2OverlayRef.current) {
      v2OverlayRef.current.close();
      v2OverlayRef.current = null;
    }
    // storeRef.current is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPaginatedFlyout = useCallback(
    (documentIndex: number, explicitStateUpdate?: Partial<ScopedPaginationSlice>): void => {
      const stateUpdate =
        explicitStateUpdate ?? resolveDocumentRef.current?.(documentIndex) ?? null;

      storeRef.current.setState({
        flyoutDocumentIndex: documentIndex,
        ...(stateUpdate ?? {}),
      });

      if (v2OverlayRef.current) return;
      const {
        openFlyout: infraOpenFlyout,
        defaultFlyoutProperties: infraDefaultProps,
        renderBody: infraRenderBody,
        origin: infraOrigin,
        onClose: infraOnClose,
      } = infraRef.current;
      const store = storeRef.current;
      v2OverlayRef.current = infraOpenFlyout(
        React.createElement(PaginationStoreProvider, { value: store }, infraRenderBody()),
        {
          ...infraDefaultProps,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          onClose: (flyout: OverlayRef) => {
            flyout.close();
            v2OverlayRef.current = null;
            store.setState(SOFT_RESET);
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
    // historyKey is stable. Mutable values are read through refs. storeRef.current is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyKey]
  );

  // Register `openDocumentFlyoutImpl` so the in-flyout `EuiPagination` can
  // dispatch back through `openPaginatedFlyout` across the separate React root.
  useEffect(() => {
    storeRef.current.setState({
      openDocumentFlyoutImpl: (documentIndex: number) => openPaginatedFlyout(documentIndex),
    });
    return () => {
      storeRef.current.setState({ openDocumentFlyoutImpl: null });
    };
    // storeRef.current and openPaginatedFlyout are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPaginatedFlyout]);

  // Close the overlay on unmount (navigation away from the source page).
  useEffect(() => {
    return () => {
      storeRef.current.setState(SOFT_RESET);
      if (v2OverlayRef.current) {
        v2OverlayRef.current.close();
        v2OverlayRef.current = null;
      }
    };
    // storeRef.current is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDocumentFlyout = useCallback(
    (documentIndex: number): void => openPaginatedFlyout(documentIndex),
    [openPaginatedFlyout]
  );

  const slice = useMemo(
    () => ({ ...rawSlice, openDocumentFlyout }),
    [rawSlice, openDocumentFlyout]
  );

  return { slice, setState, openPaginatedFlyout, closePaginatedFlyout, openDocumentFlyout };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { noop } from 'lodash/fp';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { cellActionRenderer } from '../shared/components/cell_actions';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';

// Lazy-loaded so consumers of this hook don't statically pull the attack flyout graph into their
// bundle; the chunk only loads when the flyout (or one of its tools) is actually opened.
const AttackFlyoutWrapper = lazy(() =>
  import('./main/attack_flyout_wrapper').then((m) => ({ default: m.AttackFlyoutWrapper }))
);
const CorrelationsDetails = lazy(() =>
  import('./tools/correlations').then((m) => ({ default: m.CorrelationsDetails }))
);
const EntitiesDetails = lazy(() =>
  import('./tools/entities').then((m) => ({ default: m.EntitiesDetails }))
);

export interface OpenAttackFlyoutParams {
  /** Elasticsearch `_id` of the attack discovery alert. */
  attackId: string;
  /** Concrete `_index` the attack lives in. */
  indexName: string;
  /** Invoked after the attack is mutated inside the flyout, to let the caller refresh. Defaults to a no-op. */
  onAttackUpdated?: () => void;
  /** Renderer for cell actions in nested alert flyouts. Defaults to the standard `cellActionRenderer`. */
  renderCellActions?: CellActionRenderer;
}

export interface OpenAttackCorrelationsParams {
  /** The raw attack document hit. */
  hit: DataTableRecord;
  /** Ids of the alerts correlated to the attack. */
  alertIds: string[];
  /** Optional callback to open one of the correlated alerts. */
  onShowAlert?: (id: string, indexName: string) => void;
}

export interface OpenAttackEntitiesParams {
  /** The raw attack document hit. */
  hit: DataTableRecord;
  /** Ids of the alerts correlated to the attack. */
  alertIds: string[];
}

export interface AttackFlyoutApi {
  /**
   * Opens the attack discovery details flyout as a new, top-level flyout (starting a fresh session).
   * Use this from outside any flyout — e.g. a table row, a timeline row, a case attachment.
   */
  openAttackFlyout: (params: OpenAttackFlyoutParams) => void;
  /**
   * Opens the attack discovery details flyout as a child of the currently open flyout (nested in its
   * history stack, so the back button returns to it). Use this from within an already-open flyout.
   */
  openAttackFlyoutAsChild: (params: OpenAttackFlyoutParams) => void;
  /** Opens the attack's Correlations tool flyout (alerts correlated to the attack). */
  openAttackCorrelations: (params: OpenAttackCorrelationsParams) => void;
  /** Opens the attack's Entities tool flyout (hosts/users involved in the attack). */
  openAttackEntities: (params: OpenAttackEntitiesParams) => void;
}

/**
 * Developer-facing API to open the new (EUI-based) attack flyout and its tool flyouts, in the same
 * mindset as `useExpandableFlyoutApi`, `useDocumentFlyoutApi`, etc. It encapsulates the provider
 * wiring (`flyoutProviders` + `overlays.openSystemFlyout`) and the per-flyout properties so call
 * sites don't repeat them.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useAttackFlyoutApi = (): AttackFlyoutApi => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  // The main/child flyout and the tools differ only in their properties (base size + session). Both
  // are kept private here so callers never reason about them: they pick the method they want and
  // this helper opens the system flyout with the given properties.
  const open = useCallback(
    (children: ReactNode, properties: OverlaySystemFlyoutOpenOptions) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>,
        }),
        properties
      );
    },
    [overlays, services, store, history]
  );

  const openAttackFlyout = useCallback(
    ({
      attackId,
      indexName,
      onAttackUpdated = noop,
      renderCellActions = cellActionRenderer,
    }: OpenAttackFlyoutParams) => {
      open(
        <AttackFlyoutWrapper
          attackId={attackId}
          indexName={indexName}
          onAttackUpdated={onAttackUpdated}
          renderCellActions={renderCellActions}
        />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: 'start' }
      );
    },
    [open, defaultDocumentFlyoutProperties, historyKey]
  );

  const openAttackFlyoutAsChild = useCallback(
    ({
      attackId,
      indexName,
      onAttackUpdated = noop,
      renderCellActions = cellActionRenderer,
    }: OpenAttackFlyoutParams) => {
      open(
        <AttackFlyoutWrapper
          attackId={attackId}
          indexName={indexName}
          onAttackUpdated={onAttackUpdated}
          renderCellActions={renderCellActions}
        />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: 'inherit' }
      );
    },
    [open, defaultDocumentFlyoutProperties, historyKey]
  );

  const openAttackCorrelations = useCallback(
    ({ hit, alertIds, onShowAlert }: OpenAttackCorrelationsParams) => {
      open(<CorrelationsDetails hit={hit} alertIds={alertIds} onShowAlert={onShowAlert} />, {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      });
    },
    [open, historyKey]
  );

  const openAttackEntities = useCallback(
    ({ hit, alertIds }: OpenAttackEntitiesParams) => {
      open(<EntitiesDetails hit={hit} alertIds={alertIds} />, {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      });
    },
    [open, historyKey]
  );

  return useMemo(
    () => ({
      openAttackFlyout,
      openAttackFlyoutAsChild,
      openAttackCorrelations,
      openAttackEntities,
    }),
    [openAttackFlyout, openAttackFlyoutAsChild, openAttackCorrelations, openAttackEntities]
  );
};

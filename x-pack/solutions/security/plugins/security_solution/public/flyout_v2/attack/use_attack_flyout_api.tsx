/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useMemo } from 'react';
import { noop } from 'lodash/fp';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { cellActionRenderer } from '../shared/components/cell_actions';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import type { FlyoutOrigin } from '../../common/lib/telemetry';
import {
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TOOL,
  FLYOUT_TYPE,
} from '../../common/lib/telemetry';
import {
  ATTACK_CORRELATIONS_TITLE,
  ATTACK_ENTITIES_TITLE,
  ATTACK_TITLE,
  formatFlyoutTitle,
} from '../shared/constants/flyout_titles';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import { getAttackTitleValue } from './utils/get_attack_title';
import { useFlyoutSessionContext } from '../session_context';

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
  /**
   * Display title of the attack, if already known by the caller (e.g. from a list/table row).
   * Used to build the flyout-history title; when omitted, the history entry falls back to the
   * bare "Attack" label.
   */
  attackTitle?: string;
  /** Renderer for cell actions in nested alert flyouts. Defaults to the standard `cellActionRenderer`. */
  renderCellActions?: CellActionRenderer;
  /** Which UI trigger opened this flyout, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenAttackCorrelationsParams {
  /** The raw attack document hit. */
  hit: DataTableRecord;
  /** Ids of the alerts correlated to the attack. */
  alertIds: string[];
  /** Optional callback to open one of the correlated alerts. */
  onShowAlert?: (id: string, indexName: string, title?: string) => void;
  /** Which UI trigger opened the correlations tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenAttackEntitiesParams {
  /** The raw attack document hit. */
  hit: DataTableRecord;
  /** Ids of the alerts correlated to the attack. */
  alertIds: string[];
  /** Which UI trigger opened the entities tool, when known. */
  origin?: FlyoutOrigin;
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
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const open = useOpenFlyout();

  const openAttackFlyout = useCallback(
    ({
      attackId,
      indexName,
      onAttackUpdated = noop,
      attackTitle,
      renderCellActions = cellActionRenderer,
      origin,
    }: OpenAttackFlyoutParams) => {
      open(
        <AttackFlyoutWrapper
          attackId={attackId}
          indexName={indexName}
          onAttackUpdated={onAttackUpdated}
          renderCellActions={renderCellActions}
        />,
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: sessionMode,
          title: formatFlyoutTitle(ATTACK_TITLE, attackTitle),
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.ATTACK,
          session: sessionMode,
          origin,
        }
      );
    },
    [open, defaultDocumentFlyoutProperties, historyKey, sessionMode]
  );

  const openAttackFlyoutAsChild = useCallback(
    ({
      attackId,
      indexName,
      onAttackUpdated = noop,
      attackTitle,
      renderCellActions = cellActionRenderer,
      origin,
    }: OpenAttackFlyoutParams) => {
      open(
        <AttackFlyoutWrapper
          attackId={attackId}
          indexName={indexName}
          onAttackUpdated={onAttackUpdated}
          renderCellActions={renderCellActions}
        />,
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.INHERIT,
          title: buildFlyoutNavTitle(formatFlyoutTitle(ATTACK_TITLE, attackTitle)),
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.ATTACK,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, defaultDocumentFlyoutProperties, historyKey]
  );

  const openAttackCorrelations = useCallback(
    ({ hit, alertIds, onShowAlert, origin }: OpenAttackCorrelationsParams) => {
      open(
        <CorrelationsDetails hit={hit} alertIds={alertIds} onShowAlert={onShowAlert} />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(ATTACK_CORRELATIONS_TITLE, getAttackTitleValue(hit)),
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.CORRELATIONS,
          flyoutType: FLYOUT_TYPE.ATTACK,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey]
  );

  const openAttackEntities = useCallback(
    ({ hit, alertIds, origin }: OpenAttackEntitiesParams) => {
      open(
        <EntitiesDetails hit={hit} alertIds={alertIds} />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(ATTACK_ENTITIES_TITLE, getAttackTitleValue(hit)),
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.ENTITIES,
          flyoutType: FLYOUT_TYPE.ATTACK,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
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

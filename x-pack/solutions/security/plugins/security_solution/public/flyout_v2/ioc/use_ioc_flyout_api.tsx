/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useStore } from 'react-redux-v7';
import { useHistory } from 'react-router-dom';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  type Indicator,
  RawIndicatorFieldId,
} from '../../../common/threat_intelligence/types/indicator';
import { getIndicatorFieldAndValue } from '../../threat_intelligence/modules/indicators/utils/field_value';
import { useKibana } from '../../common/lib/kibana';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { cellActionRenderer } from '../shared/components/cell_actions';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import { formatFlyoutTitle, IOC_TITLE } from '../shared/constants/flyout_titles';
import { FlyoutSessionContextProvider, useFlyoutSessionContext } from '../session_context';

// Lazy-loaded so consumers of this hook don't statically pull the IOC flyout graph into their
// bundle; the chunk only loads when the flyout is actually opened.
const IOCDetails = lazy(() => import('./main').then((m) => ({ default: m.IOCDetails })));

export interface OpenIocFlyoutParams {
  /** The indicator to render in the flyout. Its `_id`/`fields` are used to build the flyout's record. */
  indicator: Indicator;
  /** Renderer for cell actions in the flyout. Defaults to the standard `cellActionRenderer`. */
  renderCellActions?: CellActionRenderer;
}

export interface IocFlyoutApi {
  /**
   * Opens the indicator (IOC) details flyout as a new, top-level flyout (starting a fresh session).
   * Use this from outside any flyout — e.g. a table row, a case attachment.
   */
  openIocFlyout: (params: OpenIocFlyoutParams) => void;
  /**
   * Opens the indicator (IOC) details flyout as a child of the currently open flyout (nested in its
   * history stack, so the back button returns to it). Use this from within an already-open flyout.
   */
  openIocFlyoutAsChild: (params: OpenIocFlyoutParams) => void;
}

/**
 * Developer-facing API to open the new (EUI-based) IOC flyout, in the same mindset as
 * `useExpandableFlyoutApi`, `useDocumentFlyoutApi`, etc. It encapsulates the provider wiring
 * (`flyoutProviders` + `overlays.openSystemFlyout`), the flyout properties, and building the
 * `IOCDetails` record from the indicator, so call sites don't repeat them.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useIocFlyoutApi = (): IocFlyoutApi => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  // `session` is the only thing that differs between a main and a child flyout. It is kept private
  // here so callers never have to reason about it: they pick `openIocFlyout` (main) or
  // `openIocFlyoutAsChild` (child) and this helper maps that to the right session.
  const open = useCallback(
    (
      children: ReactNode,
      session: OverlaySystemFlyoutOpenOptions['session'],
      title: OverlaySystemFlyoutOpenOptions['title']
    ) => {
      const properties: OverlaySystemFlyoutOpenOptions = {
        ...defaultDocumentFlyoutProperties,
        historyKey,
        session,
        title,
      };
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <FlyoutSessionContextProvider
              value={{
                session: session === 'inherit' ? 'inherit' : sessionMode,
                historyKey,
              }}
            >
              <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>
            </FlyoutSessionContextProvider>
          ),
        }),
        properties
      );
    },
    [overlays, services, store, history, defaultDocumentFlyoutProperties, historyKey, sessionMode]
  );

  // Builds the flyout content (an `IOCDetails` element with a record derived from the indicator),
  // shared by both the main and child open methods.
  const buildContent = useCallback(
    ({ indicator, renderCellActions = cellActionRenderer }: OpenIocFlyoutParams): ReactNode => {
      const hit: DataTableRecord = {
        id: indicator._id as string,
        raw: { _id: indicator._id as string, fields: indicator.fields },
        flattened: indicator.fields as Record<string, unknown>,
      };
      return <IOCDetails hit={hit} renderCellActions={renderCellActions} />;
    },
    []
  );

  const getTitle = useCallback(
    ({ indicator }: OpenIocFlyoutParams) =>
      formatFlyoutTitle(
        IOC_TITLE,
        getIndicatorFieldAndValue(indicator, RawIndicatorFieldId.Name).value
      ),
    []
  );

  const openIocFlyout = useCallback(
    (params: OpenIocFlyoutParams) => open(buildContent(params), sessionMode, getTitle(params)),
    [open, buildContent, sessionMode, getTitle]
  );

  const openIocFlyoutAsChild = useCallback(
    (params: OpenIocFlyoutParams) =>
      open(buildContent(params), 'inherit', buildFlyoutNavTitle(getTitle(params))),
    [open, buildContent, getTitle]
  );

  return useMemo(
    () => ({ openIocFlyout, openIocFlyoutAsChild }),
    [openIocFlyout, openIocFlyoutAsChild]
  );
};

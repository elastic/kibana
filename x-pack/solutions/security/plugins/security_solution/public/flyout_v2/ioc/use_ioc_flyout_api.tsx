/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  type Indicator,
  RawIndicatorFieldId,
} from '../../../common/threat_intelligence/types/indicator';
import { getIndicatorFieldAndValue } from '../../threat_intelligence/modules/indicators/utils/field_value';
import type { FlyoutOrigin, FlyoutSessionKind } from '../../common/lib/telemetry';
import { FLYOUT_SESSION_KIND, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../common/lib/telemetry';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { cellActionRenderer } from '../shared/components/cell_actions';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import { formatFlyoutTitle, IOC_TITLE } from '../shared/constants/flyout_titles';
import { useFlyoutSessionContext } from '../session_context';
import { useFlyoutV2UrlWriter } from '../shared/url_state/flyout_v2_url_writer';
import {
  FLYOUT_DESCRIPTOR_KIND,
  decodeFlyoutV2UrlParam,
  urlParamKeyForHistoryKey,
} from '../shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../shared/url_state/flyout_v2_url_param';

// Lazy-loaded so consumers of this hook don't statically pull the IOC flyout graph into their
// bundle; the chunk only loads when the flyout is actually opened.
const IOCDetails = lazy(() => import('./main').then((m) => ({ default: m.IOCDetails })));

/**
 * The `indicator` is an ES search hit, so at runtime it carries `_index` even though the
 * `Indicator` type only declares `_id`/`fields`. Persisting it in the URL descriptor lets the
 * restore hook re-fetch the indicator on refresh: it filters by `_index` against the default
 * security data view, which matches threat-intel indices (`logs-ti_*`) via its `logs-*` pattern.
 * Falls back to '' when unavailable (e.g. a case attachment without the source hit), in which case
 * the restore is gracefully skipped.
 */
const getIndicatorIndex = (indicator: Indicator): string => {
  const rawIndex = (indicator as { _index?: unknown })._index;
  return typeof rawIndex === 'string' ? rawIndex : '';
};

export interface OpenIocFlyoutParams {
  /** The indicator to render in the flyout. Its `_id`/`fields` are used to build the flyout's record. */
  indicator: Indicator;
  /** Renderer for cell actions in the flyout. Defaults to the standard `cellActionRenderer`. */
  renderCellActions?: CellActionRenderer;
  /** Which UI trigger opened this flyout, when known. */
  origin?: FlyoutOrigin;
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
  const history = useHistory();
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const openFlyout = useOpenFlyout();
  const urlParamKey = urlParamKeyForHistoryKey(historyKey);
  const { writeOnOpen, buildOnClose } = useFlyoutV2UrlWriter(urlParamKey, historyKey);

  const readFirstDescriptor = useCallback((): FlyoutDescriptor | null => {
    if (!history?.location) return null;
    const raw = new URLSearchParams(history.location.search).get(urlParamKey);
    const stack = decodeFlyoutV2UrlParam(raw);
    return stack?.[0] ?? null;
  }, [history, urlParamKey]);

  const open = useCallback(
    (
      children: ReactNode,
      session: FlyoutSessionKind,
      title: OverlaySystemFlyoutOpenOptions['title'],
      onClose: (() => void) | undefined,
      origin?: FlyoutOrigin
    ) => {
      const properties: OverlaySystemFlyoutOpenOptions = {
        ...defaultDocumentFlyoutProperties,
        historyKey,
        session,
        title,
        onClose,
      };
      openFlyout(
        children,
        properties,
        { surface: FLYOUT_SURFACE.FLYOUT, flyoutType: FLYOUT_TYPE.IOC, session, origin },
        session === FLYOUT_SESSION_KIND.INHERIT ? FLYOUT_SESSION_KIND.INHERIT : sessionMode
      );
    },
    [openFlyout, defaultDocumentFlyoutProperties, historyKey, sessionMode]
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
    (params: OpenIocFlyoutParams) => {
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.ioc,
        indicatorId: params.indicator._id as string,
        indicatorIndex: getIndicatorIndex(params.indicator),
      });
      const onClose = buildOnClose(null);
      open(buildContent(params), sessionMode, getTitle(params), onClose, params.origin);
    },
    [open, buildContent, sessionMode, getTitle, writeOnOpen, buildOnClose]
  );

  const openIocFlyoutAsChild = useCallback(
    (params: OpenIocFlyoutParams) => {
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(
        {
          kind: FLYOUT_DESCRIPTOR_KIND.ioc,
          indicatorId: params.indicator._id as string,
          indicatorIndex: getIndicatorIndex(params.indicator),
        },
        'inherit'
      );
      const onClose = buildOnClose(parentDescriptor);
      open(
        buildContent(params),
        FLYOUT_SESSION_KIND.INHERIT,
        buildFlyoutNavTitle(getTitle(params)),
        onClose,
        params.origin
      );
    },
    [open, buildContent, getTitle, readFirstDescriptor, writeOnOpen, buildOnClose]
  );

  return useMemo(
    () => ({ openIocFlyout, openIocFlyoutAsChild }),
    [openIocFlyout, openIocFlyoutAsChild]
  );
};

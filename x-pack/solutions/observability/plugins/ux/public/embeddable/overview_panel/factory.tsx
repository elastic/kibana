/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import {
  fetch$,
  initializeStateApi,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { Router } from '@kbn/shared-ux-router';
import { OBLT_UX_APP_ID } from '@kbn/deeplinks-observability';
import { useEuiTheme } from '@elastic/eui';
import { createMemoryHistory, type History, type LocationDescriptorObject } from 'history';
import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { serviceNameFromDashboardFilters } from '../../../common/embeddables/overview_panel/app_control';
import {
  UX_OVERVIEW_PANEL_EMBEDDABLE_ID,
  UX_OVERVIEW_PANEL_SIZES,
} from '../../../common/embeddables/overview_panel/constants';
import { uxOverviewPanelTitle } from '../../../common/embeddables/overview_panel/panel_copy';
import { overviewPanelStateToQuery } from '../../../common/embeddables/overview_panel/serialize_state';
import type {
  UxOverviewPanelCustomState,
  UxOverviewPanelEmbeddableState,
} from '../../../common/embeddables/overview_panel/types';
import type { ApmPluginStartDeps } from '../../plugin';
import { mergeRumSearch } from '../../utils/rum_search';
import { uxAppPath } from '../../utils/ux_app_path';
import { UxOverviewEmbeddableBody } from './embeddable_body';

const defaultCustomState: UxOverviewPanelCustomState = {
  panel: 'kpis',
  service_name: undefined,
  range_from: 'now-24h',
  range_to: 'now',
  kuery: undefined,
  browser: undefined,
  os: undefined,
  location: undefined,
  page_url: undefined,
  frustration: undefined,
  user: undefined,
  include_bots: undefined,
  bot_ua: undefined,
  breakpoint: undefined,
  connection: undefined,
  device: undefined,
  analytics_mode: undefined,
};

const withQueryPrefix = (search: string): string =>
  !search || search.startsWith('?') ? search : `?${search}`;

const appPathFromLocation = (
  location: LocationDescriptorObject,
  fallbackPathname: string
): string => {
  const pathname = location.pathname ?? fallbackPathname;
  return `${pathname}${withQueryPrefix(location.search ?? '')}`;
};

const searchFromState = (
  state: UxOverviewPanelCustomState,
  rangeFrom: string,
  rangeTo: string
): string => {
  const { serviceName: _serviceName, ...patch } = overviewPanelStateToQuery({
    ...state,
    range_from: rangeFrom,
    range_to: rangeTo,
  });
  return mergeRumSearch('', patch);
};

const createUxHistory = (
  application: CoreStart['application'],
  serviceName: string | undefined,
  search: string
): History => {
  const fallbackPathname = uxAppPath(serviceName);
  const history = createMemoryHistory({
    initialEntries: [{ pathname: fallbackPathname, search: withQueryPrefix(search) }],
  });
  const originalPush = history.push.bind(history);
  history.push = (path, state) => {
    const location: LocationDescriptorObject =
      typeof path === 'string' ? { pathname: path, search: '', state } : path;
    void application.navigateToApp(OBLT_UX_APP_ID, {
      path: appPathFromLocation(location, fallbackPathname),
    });
    return originalPush(path as never, state);
  };
  return history;
};

export const getUxOverviewPanelEmbeddableFactory = ({
  coreStart,
  pluginsStart,
}: {
  coreStart: CoreStart;
  pluginsStart: ApmPluginStartDeps;
}): EmbeddablePublicDefinition<UxOverviewPanelEmbeddableState> => ({
  type: UX_OVERVIEW_PANEL_EMBEDDABLE_ID,
  getPlacementHints: (serializedState) => UX_OVERVIEW_PANEL_SIZES[serializedState?.panel ?? 'kpis'],
  buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
    const titleManager = initializeTitleManager(initialState);
    const defaultTitle$ = new BehaviorSubject<string | undefined>(
      initialState.title ?? uxOverviewPanelTitle(initialState.panel ?? 'kpis')
    );
    const panelManager = initializeStateManager<UxOverviewPanelCustomState>(
      initialState,
      defaultCustomState
    );
    const reload$ = new Subject<boolean>();

    const stateApi = initializeStateApi<UxOverviewPanelEmbeddableState>({
      uuid,
      parentApi,
      serializeState: () => ({
        ...titleManager.getLatestState(),
        ...panelManager.getLatestState(),
      }),
      anyStateChange$: merge(titleManager.anyStateChange$, panelManager.anyStateChange$),
      getComparators: () => ({
        ...titleComparators,
        panel: 'referenceEquality',
        service_name: 'referenceEquality',
        range_from: 'referenceEquality',
        range_to: 'referenceEquality',
        kuery: 'referenceEquality',
        browser: 'referenceEquality',
        os: 'referenceEquality',
        location: 'referenceEquality',
        page_url: 'referenceEquality',
        frustration: 'referenceEquality',
        user: 'referenceEquality',
        include_bots: 'referenceEquality',
        bot_ua: 'referenceEquality',
        breakpoint: 'referenceEquality',
        connection: 'referenceEquality',
        device: 'referenceEquality',
        analytics_mode: 'referenceEquality',
      }),
      applySerializedState: (nextState) => {
        panelManager.reinitializeState(nextState);
        titleManager.reinitializeState(nextState);
      },
    });

    const api = finalizeApi({
      ...titleManager.api,
      ...stateApi,
      defaultTitle$,
    });

    const fetchSubscription = fetch$(api).subscribe((next) => {
      if (next.isReload) {
        reload$.next(true);
      }
    });

    const services = { ...coreStart, ...pluginsStart };

    return {
      api,
      Component: () => {
        const fetchContext = useFetchContext(api);
        const { euiTheme } = useEuiTheme();
        const [tick, setTick] = useState(0);
        const [panelTitle] = useBatchedPublishingSubjects(titleManager.api.title$);

        useEffect(() => {
          const sub = merge(panelManager.anyStateChange$, reload$).subscribe(() => {
            setTick((n) => n + 1);
          });
          return () => {
            sub.unsubscribe();
            fetchSubscription.unsubscribe();
          };
        }, []);

        const customState: UxOverviewPanelCustomState = {
          ...defaultCustomState,
          ...panelManager.getLatestState(),
        };
        const rangeFrom = fetchContext.timeRange?.from ?? customState.range_from;
        const rangeTo = fetchContext.timeRange?.to ?? customState.range_to;
        const serviceName =
          serviceNameFromDashboardFilters(fetchContext.filters) ?? customState.service_name;
        const queryState = { ...customState, service_name: serviceName };
        const historySearch = searchFromState(queryState, rangeFrom, rangeTo);
        const history = useMemo(
          () => createUxHistory(coreStart.application, queryState.service_name, historySearch),
          [queryState.service_name, historySearch]
        );

        return (
          <KibanaRenderContextProvider {...coreStart}>
            <KibanaContextProvider services={services}>
              <Router history={history}>
                <div
                  style={{
                    flex: 1,
                    alignSelf: 'stretch',
                    height: '100%',
                    width: '100%',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'auto',
                    boxSizing: 'border-box',
                    padding: euiTheme.size.l,
                  }}
                >
                  <UxOverviewEmbeddableBody
                    key={tick}
                    state={queryState}
                    title={panelTitle}
                    rangeFrom={rangeFrom}
                    rangeTo={rangeTo}
                  />
                </div>
              </Router>
            </KibanaContextProvider>
          </KibanaRenderContextProvider>
        );
      },
    };
  },
});

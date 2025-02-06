/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  fetch$,
  getUnchangingComparator,
  initializeTitleManager,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserHistory } from 'history';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { PluginContext } from '../../../context/plugin_context';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from './constants';
import { GroupSloView } from './group_view/group_view';
import { SloOverview } from './slo_overview';
import { SloCardChartList } from './slo_overview_grid';
import { GroupSloCustomInput, SloOverviewApi, SloOverviewEmbeddableState } from './types';
import { openSloConfiguration } from './slo_overview_open_configuration';

const getOverviewPanelTitle = () =>
  i18n.translate('xpack.slo.sloEmbeddable.displayName', {
    defaultMessage: 'SLO Overview',
  });

export const getOverviewEmbeddableFactory = ({
  coreStart,
  pluginsStart,
  sloClient,
}: {
  coreStart: CoreStart;
  pluginsStart: SLOPublicPluginsStart;
  sloClient: SLORepositoryClient;
}): ReactEmbeddableFactory<
  SloOverviewEmbeddableState,
  SloOverviewEmbeddableState,
  SloOverviewApi
> => ({
  type: SLO_OVERVIEW_EMBEDDABLE_ID,
  deserializeState: (state) => {
    return state.rawState as SloOverviewEmbeddableState;
  },
  buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
    const deps = { ...coreStart, ...pluginsStart };

    const dynamicActionsApi = deps.embeddableEnhanced?.initializeReactEmbeddableDynamicActions(
      uuid,
      () => titleManager.api.title$.getValue(),
      state
    );

    const maybeStopDynamicActions = dynamicActionsApi?.startDynamicActions();

    const titleManager = initializeTitleManager(state);
    const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
    const sloId$ = new BehaviorSubject(state.sloId);
    const sloInstanceId$ = new BehaviorSubject(state.sloInstanceId);
    const showAllGroupByInstances$ = new BehaviorSubject(state.showAllGroupByInstances);
    const overviewMode$ = new BehaviorSubject(state.overviewMode);
    const groupFilters$ = new BehaviorSubject(state.groupFilters);
    const remoteName$ = new BehaviorSubject(state.remoteName);
    const reload$ = new Subject<boolean>();

    const api = buildApi(
      {
        ...titleManager.api,
        ...(dynamicActionsApi?.dynamicActionsApi ?? {}),
        supportedTriggers: () => [],
        defaultTitle$,
        getTypeDisplayName: () =>
          i18n.translate('xpack.slo.editSloOverviewEmbeddableTitle.typeDisplayName', {
            defaultMessage: 'criteria',
          }),
        isEditingEnabled: () => api.getSloGroupOverviewConfig().overviewMode === 'groups',
        onEdit: async function onEdit() {
          try {
            const result = await openSloConfiguration(
              coreStart,
              pluginsStart,
              sloClient,
              api.getSloGroupOverviewConfig()
            );
            api.updateSloGroupOverviewConfig(result as GroupSloCustomInput);
          } catch (e) {
            return Promise.reject();
          }
        },
        serializeState: () => {
          return {
            rawState: {
              ...titleManager.serialize(),
              sloId: sloId$.getValue(),
              sloInstanceId: sloInstanceId$.getValue(),
              showAllGroupByInstances: showAllGroupByInstances$.getValue(),
              overviewMode: overviewMode$.getValue(),
              groupFilters: groupFilters$.getValue(),
              remoteName: remoteName$.getValue(),
              ...(dynamicActionsApi?.serializeDynamicActions?.() ?? {}),
            },
          };
        },
        getSloGroupOverviewConfig: () => {
          return {
            groupFilters: groupFilters$.getValue(),
            overviewMode: overviewMode$.getValue(),
          };
        },
        updateSloGroupOverviewConfig: (update: GroupSloCustomInput) => {
          groupFilters$.next(update.groupFilters);
        },
      },
      {
        sloId: [sloId$, (value) => sloId$.next(value)],
        sloInstanceId: [sloInstanceId$, (value) => sloInstanceId$.next(value)],
        groupFilters: [groupFilters$, (value) => groupFilters$.next(value)],
        showAllGroupByInstances: [
          showAllGroupByInstances$,
          (value) => showAllGroupByInstances$.next(value),
        ],
        remoteName: [remoteName$, (value) => remoteName$.next(value)],
        overviewMode: [overviewMode$, (value) => overviewMode$.next(value)],
        ...titleManager.comparators,
        ...(dynamicActionsApi?.dynamicActionsComparator ?? {
          enhancements: getUnchangingComparator(),
        }),
      }
    );

    const fetchSubscription = fetch$(api)
      .pipe()
      .subscribe((next) => {
        reload$.next(next.isReload);
      });

    return {
      api,
      Component: () => {
        const [
          sloId,
          sloInstanceId,
          showAllGroupByInstances,
          overviewMode,
          groupFilters,
          remoteName,
        ] = useBatchedPublishingSubjects(
          sloId$,
          sloInstanceId$,
          showAllGroupByInstances$,
          overviewMode$,
          groupFilters$,
          remoteName$
        );

        useEffect(() => {
          return () => {
            fetchSubscription.unsubscribe();
            maybeStopDynamicActions?.stopDynamicActions();
          };
        }, []);
        const renderOverview = () => {
          if (overviewMode === 'groups') {
            const groupBy = groupFilters?.groupBy ?? 'status';
            const kqlQuery = groupFilters?.kqlQuery ?? '';
            const groups = groupFilters?.groups ?? [];
            return (
              <div
                css={({ euiTheme }: UseEuiTheme) => css`
                  width: 100%;
                  padding: ${euiTheme.size.xs} ${euiTheme.size.base};
                  overflow: scroll;

                  .euiAccordion__buttonContent {
                    min-width: ${euiTheme.base * 6}px;
                  }
                `}
              >
                <EuiFlexGroup data-test-subj="sloGroupOverviewPanel" data-shared-item="">
                  <EuiFlexItem
                    css={({ euiTheme }: UseEuiTheme) => css`
                      margin-top: ${euiTheme.base * 1.25}px;
                    `}
                  >
                    <GroupSloView
                      view="cardView"
                      groupBy={groupBy}
                      groups={groups}
                      kqlQuery={kqlQuery}
                      filters={groupFilters?.filters}
                      reloadSubject={reload$}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            );
          } else {
            return (
              <SloOverview
                sloId={sloId}
                sloInstanceId={sloInstanceId}
                reloadSubject={reload$}
                showAllGroupByInstances={showAllGroupByInstances}
                remoteName={remoteName}
              />
            );
          }
        };

        const queryClient = new QueryClient();

        return (
          <Router history={createBrowserHistory()}>
            <EuiThemeProvider darkMode={true}>
              <KibanaContextProvider services={deps}>
                <PluginContext.Provider
                  value={{
                    observabilityRuleTypeRegistry:
                      pluginsStart.observability.observabilityRuleTypeRegistry,
                    ObservabilityPageTemplate:
                      pluginsStart.observabilityShared.navigation.PageTemplate,
                    sloClient,
                  }}
                >
                  <QueryClientProvider client={queryClient}>
                    {showAllGroupByInstances ? (
                      <SloCardChartList sloId={sloId!} />
                    ) : (
                      renderOverview()
                    )}
                  </QueryClientProvider>
                </PluginContext.Provider>
              </KibanaContextProvider>
            </EuiThemeProvider>
          </Router>
        );
      },
    };
  },
});

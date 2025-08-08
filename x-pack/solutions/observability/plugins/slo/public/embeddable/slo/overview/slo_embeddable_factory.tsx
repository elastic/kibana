/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  WithAllKeys,
  fetch$,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserHistory } from 'history';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { PluginContext } from '../../../context/plugin_context';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from './constants';
import { GroupSloView } from './group_view/group_view';
import { SloOverview } from './slo_overview';
import { SloCardChartList } from './slo_overview_grid';
import {
  GroupSloCustomInput,
  SloOverviewApi,
  SloOverviewEmbeddableState,
  SloOverviewState,
} from './types';
import { openSloConfiguration } from './slo_overview_open_configuration';

const getOverviewPanelTitle = () =>
  i18n.translate('xpack.slo.sloEmbeddable.displayName', {
    defaultMessage: 'SLO Overview',
  });

const defaultSloEmbeddableState: WithAllKeys<SloOverviewState> = {
  sloId: undefined,
  sloInstanceId: undefined,
  showAllGroupByInstances: undefined,
  overviewMode: undefined,
  groupFilters: undefined,
  remoteName: undefined,
};

export const getOverviewEmbeddableFactory = ({
  coreStart,
  pluginsStart,
  sloClient,
}: {
  coreStart: CoreStart;
  pluginsStart: SLOPublicPluginsStart;
  sloClient: SLORepositoryClient;
}): EmbeddableFactory<SloOverviewEmbeddableState, SloOverviewApi> => ({
  type: SLO_OVERVIEW_EMBEDDABLE_ID,
  buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
    const deps = { ...coreStart, ...pluginsStart };
    const state = initialState.rawState;

    const dynamicActionsManager = deps.embeddableEnhanced?.initializeEmbeddableDynamicActions(
      uuid,
      () => titleManager.api.title$.getValue(),
      initialState
    );

    const maybeStopDynamicActions = dynamicActionsManager?.startDynamicActions();

    const titleManager = initializeTitleManager(state);
    const sloStateManager = initializeStateManager(state, defaultSloEmbeddableState);
    const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
    const reload$ = new Subject<boolean>();

    function serializeState() {
      const { rawState: dynamicActionsState, references: dynamicActionsReferences } =
        dynamicActionsManager?.serializeState() ?? {};
      return {
        rawState: {
          ...titleManager.getLatestState(),
          ...sloStateManager.getLatestState(),
          ...dynamicActionsState,
        },
        references: dynamicActionsReferences ?? [],
      };
    }

    const unsavedChangesApi = initializeUnsavedChanges<SloOverviewEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        ...(dynamicActionsManager ? [dynamicActionsManager.anyStateChange$] : []),
        titleManager.anyStateChange$,
        sloStateManager.anyStateChange$
      ),
      getComparators: () => ({
        sloId: 'referenceEquality',
        sloInstanceId: 'referenceEquality',
        groupFilters: 'referenceEquality',
        showAllGroupByInstances: 'referenceEquality',
        remoteName: 'referenceEquality',
        overviewMode: 'referenceEquality',
        ...titleComparators,
        ...(dynamicActionsManager?.comparators ?? { enhancements: 'skip' }),
      }),
      onReset: (lastSaved) => {
        dynamicActionsManager?.reinitializeState(lastSaved?.rawState ?? {});
        titleManager.reinitializeState(lastSaved?.rawState);
        sloStateManager.reinitializeState(lastSaved?.rawState);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      ...(dynamicActionsManager?.api ?? {}),
      ...sloStateManager.api,
      defaultTitle$,
      hideTitle$: titleManager.api.hidePanelTitles$,
      setHideTitle: titleManager.api.setHidePanelTitles,
      supportedTriggers: () => [],
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
      serializeState,
      getSloGroupOverviewConfig: () => {
        const { groupFilters, overviewMode } = sloStateManager.getLatestState();
        return {
          groupFilters,
          overviewMode,
        };
      },
      updateSloGroupOverviewConfig: (update: GroupSloCustomInput) => {
        sloStateManager.api.setGroupFilters(update.groupFilters);
      },
    });

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
          sloStateManager.api.sloId$,
          sloStateManager.api.sloInstanceId$,
          sloStateManager.api.showAllGroupByInstances$,
          sloStateManager.api.overviewMode$,
          sloStateManager.api.groupFilters$,
          sloStateManager.api.remoteName$
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

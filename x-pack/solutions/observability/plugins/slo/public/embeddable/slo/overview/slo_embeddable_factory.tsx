/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import type { TypeOf } from '@kbn/config-schema';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { WithAllKeys } from '@kbn/presentation-publishing';
import {
  fetch$,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { PluginContext } from '../../../context/plugin_context';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../../common/embeddables/overview/constants';
import { GroupSloView } from './group_view/group_view';
import { SloOverview } from './slo_overview';
import { SloCardChartList } from './slo_overview_grid';
import type {
  GroupSloCustomInput,
  SloOverviewApi,
  SloOverviewEmbeddableState, // TODO import from schema in common 
  SloOverviewState,
} from './types';
import type { SingleOverviewCustomSchema, GroupOverviewCustomSchema } from '../../../../common/embeddables/overview/schema';
import { openSloConfiguration } from './slo_overview_open_configuration';

const getOverviewPanelTitle = () =>
  i18n.translate('xpack.slo.sloEmbeddable.displayName', {
    defaultMessage: 'SLO Overview',
  });

const defaultSloEmbeddableState: WithAllKeys<SloOverviewState> = {
  slo_id: undefined,
  slo_instance_id: undefined,
  overview_mode: undefined,
  group_filters: undefined,
  remote_name: undefined,
  show_all_group_by_instances: undefined,
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
    const state = initialState;

    const dynamicActionsManager = await deps.embeddableEnhanced?.initializeEmbeddableDynamicActions(
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
      const dynamicActionsState = dynamicActionsManager?.getLatestState() ?? {};
      return {
        ...titleManager.getLatestState(),
        ...sloStateManager.getLatestState(),
        ...dynamicActionsState,
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
        slo_id: 'referenceEquality',
        slo_instance_id: 'referenceEquality',
        group_filters: 'referenceEquality',
        show_all_group_by_instances: 'referenceEquality',
        remote_name: 'referenceEquality',
        overview_mode: 'referenceEquality',
        ...titleComparators,
        ...(dynamicActionsManager?.comparators ?? { drilldowns: 'skip', enhancements: 'skip' }),
      }),
      onReset: (lastSaved) => {
        dynamicActionsManager?.reinitializeState(lastSaved ?? {});
        titleManager.reinitializeState(lastSaved);
        sloStateManager.reinitializeState(lastSaved);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      ...(dynamicActionsManager?.api ?? {}),
      ...sloStateManager.api,
      defaultTitle$,
      hideTitle$: titleManager.api.hideTitle$,
      setHideTitle: titleManager.api.setHideTitle,
      supportedTriggers: () => [],
      getTypeDisplayName: () =>
        i18n.translate('xpack.slo.editSloOverviewEmbeddableTitle.typeDisplayName', {
          defaultMessage: 'criteria',
        }),
      isEditingEnabled: () => api.getSloGroupOverviewConfig().overview_mode === 'groups',
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
        const { group_filters, overview_mode } = sloStateManager.getLatestState();
        return {
          group_filters,
          overview_mode,
        };
      },
      updateSloGroupOverviewConfig: (update: GroupSloCustomInput) => {
        sloStateManager.api.setGroupFilters(update.group_filters);
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
            const groupBy = groupFilters?.group_by ?? 'status';
            const kqlQuery = groupFilters?.kql_query ?? '';
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
                sloId={sloId!}
                sloInstanceId={sloInstanceId}
                reloadSubject={reload$}
                remoteName={remoteName}
                showAllGroupByInstances={showAllGroupByInstances}
              />
            );
          }
        };

        const queryClient = new QueryClient();
        return (
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
                  {overviewMode === 'groups' ? (
                    renderOverview()
                  ) : showAllGroupByInstances ? (
                    <div
                      data-test-subj="sloSingleOverviewPanel"
                      data-shared-item=""
                      style={{ width: '100%' }}
                    >
                      <SloCardChartList data-test-subj="sloSingleOverviewPanel" sloId={sloId!} />
                    </div>
                  ) : (
                    renderOverview()
                  )}
                </QueryClientProvider>
              </PluginContext.Provider>
            </KibanaContextProvider>
          </EuiThemeProvider>
        );
      },
    };
  },
});

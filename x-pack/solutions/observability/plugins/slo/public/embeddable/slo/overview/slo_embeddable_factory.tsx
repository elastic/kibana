/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ALL_VALUE } from '@kbn/slo-schema';
import {
  fetch$,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject, map, merge } from 'rxjs';
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { PluginContext } from '../../../context/plugin_context';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import {
  SLO_EMBEDDABLE_SUPPORTED_TRIGGERS,
  SLO_OVERVIEW_EMBEDDABLE_ID,
} from '../../../../common/embeddables/overview/constants';
import { GroupSloView } from './group_view/group_view';
import { SloOverview } from './slo_overview';
import { SloCardChartList } from './slo_overview_grid';
import type { SloOverviewApi } from './types';
import type {
  GroupOverviewCustomState,
  OverviewEmbeddableState,
  SingleOverviewCustomState,
} from '../../../../common/embeddables/overview/types';
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
}): EmbeddableFactory<OverviewEmbeddableState, SloOverviewApi> => ({
  type: SLO_OVERVIEW_EMBEDDABLE_ID,
  buildEmbeddable: async ({
    initializeDrilldownsManager,
    initialState,
    finalizeApi,
    uuid,
    parentApi,
  }) => {
    const deps = { ...coreStart, ...pluginsStart };
    const state = initialState;

    const drilldownsManager = await initializeDrilldownsManager(uuid, initialState);

    const titleManager = initializeTitleManager(state);
    const overviewMode$ = new BehaviorSubject<OverviewEmbeddableState['overview_mode'] | undefined>(
      state.overview_mode
    );
    function setOverviewMode(overviewMode: OverviewEmbeddableState['overview_mode'] | undefined) {
      overviewMode$.next(overviewMode);
    }
    const singleSloManager = initializeStateManager<
      Omit<SingleOverviewCustomState, 'overview_mode'>
    >(state as SingleOverviewCustomState, {
      slo_id: '',
      slo_instance_id: undefined,
      remote_name: undefined,
    });
    const groupSloManager = initializeStateManager<Omit<GroupOverviewCustomState, 'overview_mode'>>(
      state as GroupOverviewCustomState,
      {
        group_filters: undefined,
      }
    );
    const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
    const reload$ = new Subject<boolean>();

    function serializeState(): OverviewEmbeddableState {
      const commonState = {
        ...titleManager.getLatestState(),
        ...drilldownsManager.getLatestState(),
      };

      if (overviewMode$.getValue() === 'single') {
        return {
          ...commonState,
          overview_mode: 'single',
          ...singleSloManager.getLatestState(),
        };
      }

      if (overviewMode$.getValue() === 'groups') {
        return {
          ...commonState,
          overview_mode: 'groups',
          ...groupSloManager.getLatestState(),
        };
      }

      throw new Error('overview_mode not provided');
    }

    const unsavedChangesApi = initializeUnsavedChanges<OverviewEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        drilldownsManager.anyStateChange$,
        titleManager.anyStateChange$,
        overviewMode$.pipe(map(() => undefined)),
        singleSloManager.anyStateChange$,
        groupSloManager.anyStateChange$
      ),
      getComparators: () => ({
        slo_id: 'referenceEquality',
        slo_instance_id: 'referenceEquality',
        group_filters: 'referenceEquality',
        remote_name: 'referenceEquality',
        overview_mode: 'referenceEquality',
        ...titleComparators,
        ...drilldownsManager.comparators,
      }),
      onReset: (lastSaved) => {
        drilldownsManager.reinitializeState(lastSaved ?? {});
        titleManager.reinitializeState(lastSaved);
        singleSloManager.reinitializeState(lastSaved as SingleOverviewCustomState);
        groupSloManager.reinitializeState(lastSaved as GroupOverviewCustomState);
        setOverviewMode(lastSaved?.overview_mode);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      ...drilldownsManager.api,
      defaultTitle$,
      hideTitle$: titleManager.api.hideTitle$,
      setHideTitle: titleManager.api.setHideTitle,
      supportedTriggers: () => SLO_EMBEDDABLE_SUPPORTED_TRIGGERS,
      getTypeDisplayName: () =>
        i18n.translate('xpack.slo.editSloOverviewEmbeddableTitle.typeDisplayName', {
          defaultMessage: 'criteria',
        }),
      isEditingEnabled: () => overviewMode$.getValue() === 'groups',
      onEdit: async function onEdit() {
        try {
          const result = await openSloConfiguration(
            coreStart,
            pluginsStart,
            sloClient,
            api.getSloGroupOverviewConfig()
          );
          api.updateSloGroupOverviewConfig(result as GroupOverviewCustomState);
        } catch (e) {
          return Promise.reject();
        }
      },
      serializeState,
      getSloGroupOverviewConfig: (): GroupOverviewCustomState => {
        return {
          ...groupSloManager.getLatestState(),
          overview_mode: 'groups',
        };
      },
      updateSloGroupOverviewConfig: (update: GroupOverviewCustomState) => {
        groupSloManager.api.setGroupFilters(update.group_filters);
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
        const [sloId, sloInstanceId, overviewMode, groupFilters, remoteName] =
          useBatchedPublishingSubjects(
            singleSloManager.api.sloId$,
            singleSloManager.api.sloInstanceId$,
            overviewMode$,
            groupSloManager.api.groupFilters$,
            singleSloManager.api.remoteName$
          );

        useEffect(() => {
          return () => {
            drilldownsManager.cleanup();
            fetchSubscription.unsubscribe();
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
                      filters={toStoredFilters(groupFilters?.filters) ?? []}
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
                  ) : sloInstanceId === ALL_VALUE ? (
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

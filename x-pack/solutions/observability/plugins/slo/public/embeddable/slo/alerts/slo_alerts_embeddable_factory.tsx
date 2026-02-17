/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FetchContext, WithAllKeys } from '@kbn/presentation-publishing';
import {
  fetch$,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import type { AlertsCustomState } from '../../../../common/embeddables/alerts/schema';
import { PluginContext } from '../../../context/plugin_context';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { SLO_ALERTS_EMBEDDABLE_ID } from './constants';
import { SloAlertsWrapper } from './slo_alerts_wrapper';
import type { EmbeddableSloProps, SloAlertsApi, SloAlertsEmbeddableState, SloItem } from './types';
import { openSloConfiguration } from './slo_alerts_open_configuration';
const queryClient = new QueryClient();

export const getAlertsPanelTitle = () =>
  i18n.translate('xpack.slo.sloAlertsEmbeddable.displayTitle', {
    defaultMessage: 'SLO Alerts',
  });

const defaultAlertsEmbeddableState: WithAllKeys<AlertsCustomState> = {
  slos: [],
  show_all_group_by_instances: undefined,
};

export function getAlertsEmbeddableFactory({
  coreStart,
  pluginsStart,
  sloClient,
  kibanaVersion,
}: {
  coreStart: CoreStart;
  pluginsStart: SLOPublicPluginsStart;
  sloClient: SLORepositoryClient;
  kibanaVersion: string;
}) {
  const factory: EmbeddableFactory<SloAlertsEmbeddableState, SloAlertsApi> = {
    type: SLO_ALERTS_EMBEDDABLE_ID,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const deps = { ...coreStart, ...pluginsStart };
      async function onEdit() {
        try {
          const result = await openSloConfiguration(
            coreStart,
            pluginsStart,
            sloClient,
            api.getSloAlertsConfig()
          );
          api.updateSloAlertsConfig(result);
        } catch (e) {
          return Promise.reject();
        }
      }

      const titleManager = initializeTitleManager(initialState);
      // Normalize initialState to snake_case format if it has camelCase fields
      const normalizedInitialState: Partial<AlertsCustomState> = {
        ...initialState,
        ...(initialState.slos && Array.isArray(initialState.slos)
          ? {
              slos: initialState.slos.map((slo: any) => {
                // Ensure group_by is always a string (it might come as an array from SLO data)
                const groupByValue = slo.group_by ?? slo.groupBy;
                const groupByString =
                  typeof groupByValue === 'string'
                    ? groupByValue
                    : Array.isArray(groupByValue)
                    ? groupByValue.join(',')
                    : '';
                return {
                  id: slo.id ?? '',
                  instance_id: slo.instance_id ?? slo.instanceId ?? '',
                  name: slo.name ?? '',
                  group_by: groupByString,
                };
              }),
            }
          : {}),
        ...('showAllGroupByInstances' in initialState && !('show_all_group_by_instances' in initialState)
          ? { show_all_group_by_instances: (initialState as any).showAllGroupByInstances }
          : {}),
      };
      const sloAlertsStateManager = initializeStateManager<AlertsCustomState>(
        normalizedInitialState,
        defaultAlertsEmbeddableState
      );
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getAlertsPanelTitle());
      const reload$ = new Subject<FetchContext>();

      function serializeState() {
        return {
          ...titleManager.getLatestState(),
          ...sloAlertsStateManager.getLatestState(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, sloAlertsStateManager.anyStateChange$),
        getComparators: () => ({
          ...titleComparators,
          slos: 'referenceEquality',
          show_all_group_by_instances: 'referenceEquality',
        }),
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved);
          sloAlertsStateManager.reinitializeState(lastSaved);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        defaultTitle$,
        getTypeDisplayName: () =>
          i18n.translate('xpack.slo.editSloAlertswEmbeddable.typeDisplayName', {
            defaultMessage: 'configuration',
          }),
        isEditingEnabled: () => true,
        onEdit: async () => {
          onEdit();
        },
        serializeState,
        getSloAlertsConfig: () => {
          const storedState = sloAlertsStateManager.getLatestState();
          // Convert from stored state (snake_case) to public API (camelCase)
          return {
            slos: Array.isArray(storedState.slos)
              ? storedState.slos.map((slo) => {
                  // Ensure group_by is always a string (handle case where it might be an array)
                  const groupByValue = slo.group_by ?? slo.groupBy;
                  const groupByString =
                    typeof groupByValue === 'string'
                      ? groupByValue
                      : Array.isArray(groupByValue)
                      ? groupByValue.join(',')
                      : '';
                  return {
                    id: slo.id ?? '',
                    instanceId: slo.instance_id ?? slo.instanceId ?? '',
                    name: slo.name ?? '',
                    groupBy: groupByString,
                  };
                })
              : [],
            showAllGroupByInstances: storedState.show_all_group_by_instances,
          };
        },
        updateSloAlertsConfig: (update) => {
          // Convert from public API (camelCase) to stored state (snake_case)
          sloAlertsStateManager.api.setSlos(
            update.slos.map((slo: SloItem) => {
              // Ensure groupBy is always a string (it might come as an array from SLO data)
              const groupByString =
                typeof slo.groupBy === 'string'
                  ? slo.groupBy
                  : Array.isArray(slo.groupBy)
                  ? slo.groupBy.join(',')
                  : '';
              return {
                id: slo.id,
                instance_id: slo.instanceId,
                name: slo.name,
                group_by: groupByString,
              };
            })
          );
          sloAlertsStateManager.api.setShowAllGroupByInstances(update.showAllGroupByInstances);
        },
      });

      const fetchSubscription = fetch$(api)
        .pipe()
        .subscribe((next) => {
          reload$.next(next);
        });

      return {
        api,
        Component: () => {
          const [storedSlos, showAllGroupByInstances] = useBatchedPublishingSubjects(
            sloAlertsStateManager.api.slos$,
            sloAlertsStateManager.api.showAllGroupByInstances$
          );
          // Convert from stored state (snake_case) to public API (camelCase)
          const slos: SloItem[] = Array.isArray(storedSlos)
            ? storedSlos.map((slo) => {
                // Ensure group_by is always a string (handle case where it might be an array)
                const groupByValue = slo.group_by ?? slo.groupBy;
                const groupByString =
                  typeof groupByValue === 'string'
                    ? groupByValue
                    : Array.isArray(groupByValue)
                    ? groupByValue.join(',')
                    : '';
                return {
                  id: slo.id ?? '',
                  instanceId: slo.instance_id ?? slo.instanceId ?? '',
                  name: slo.name ?? '',
                  groupBy: groupByString,
                };
              })
            : [];
          const fetchContext = useFetchContext(api);
          const I18nContext = deps.i18n.Context;

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);
          return (
            <I18nContext>
              <KibanaContextProvider
                services={{
                  ...deps,
                  storage: new Storage(localStorage),
                  isServerless: !!deps.serverless,
                  kibanaVersion,
                }}
              >
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
                    <SloAlertsWrapper
                      onEdit={onEdit}
                      deps={deps}
                      slos={slos}
                      timeRange={fetchContext.timeRange ?? { from: 'now-15m/m', to: 'now' }}
                      reloadSubject={reload$}
                      showAllGroupByInstances={showAllGroupByInstances}
                    />
                  </QueryClientProvider>
                </PluginContext.Provider>
              </KibanaContextProvider>
            </I18nContext>
          );
        },
      };
    },
  };

  return factory;
}

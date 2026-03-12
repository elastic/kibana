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
import type { FetchContext } from '@kbn/presentation-publishing';
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
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
import { PluginContext } from '../../../context/plugin_context';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { SLO_ALERTS_EMBEDDABLE_ID } from './constants';
import { SloAlertsWrapper } from './slo_alerts_wrapper';
import type { EmbeddableSloProps, SloAlertsApi, SloAlertsEmbeddableState } from './types';
import { openSloConfiguration } from './slo_alerts_open_configuration';
const queryClient = new QueryClient();

export const getAlertsPanelTitle = () =>
  i18n.translate('xpack.slo.sloAlertsEmbeddable.displayTitle', {
    defaultMessage: 'SLO Alerts',
  });

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
      const sloAlertsStateManager = initializeStateManager<EmbeddableSloProps>(initialState, {
        slos: [],
        showAllGroupByInstances: false,
      });
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
          showAllGroupByInstances: 'referenceEquality',
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
          return {
            slos: sloAlertsStateManager.api.slos$.getValue(),
            showAllGroupByInstances: sloAlertsStateManager.api.showAllGroupByInstances$.getValue(),
          };
        },
        updateSloAlertsConfig: (update) => {
          sloAlertsStateManager.api.setSlos(update.slos);
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
          const [slos, showAllGroupByInstances] = useBatchedPublishingSubjects(
            sloAlertsStateManager.api.slos$,
            sloAlertsStateManager.api.showAllGroupByInstances$
          );
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

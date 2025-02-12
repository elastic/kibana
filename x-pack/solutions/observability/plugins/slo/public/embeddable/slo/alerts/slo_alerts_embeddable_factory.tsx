/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  FetchContext,
  fetch$,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserHistory } from 'history';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { PluginContext } from '../../../context/plugin_context';
import { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { SLO_ALERTS_EMBEDDABLE_ID } from './constants';
import { SloAlertsWrapper } from './slo_alerts_wrapper';
import { SloAlertsApi, SloAlertsEmbeddableState } from './types';
import { openSloConfiguration } from './slo_alerts_open_configuration';
const history = createBrowserHistory();
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
  const factory: ReactEmbeddableFactory<
    SloAlertsEmbeddableState,
    SloAlertsEmbeddableState,
    SloAlertsApi
  > = {
    type: SLO_ALERTS_EMBEDDABLE_ID,
    deserializeState: (state) => {
      return state.rawState as SloAlertsEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
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

      const titleManager = initializeTitleManager(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getAlertsPanelTitle());
      const slos$ = new BehaviorSubject(state.slos);
      const showAllGroupByInstances$ = new BehaviorSubject(state.showAllGroupByInstances);
      const reload$ = new Subject<FetchContext>();
      const api = buildApi(
        {
          ...titleManager.api,
          defaultTitle$,
          getTypeDisplayName: () =>
            i18n.translate('xpack.slo.editSloAlertswEmbeddable.typeDisplayName', {
              defaultMessage: 'configuration',
            }),
          isEditingEnabled: () => true,
          onEdit: async () => {
            onEdit();
          },
          serializeState: () => {
            return {
              rawState: {
                ...titleManager.serialize(),
                slos: slos$.getValue(),
                showAllGroupByInstances: showAllGroupByInstances$.getValue(),
              },
            };
          },
          getSloAlertsConfig: () => {
            return {
              slos: slos$.getValue(),
              showAllGroupByInstances: showAllGroupByInstances$.getValue(),
            };
          },
          updateSloAlertsConfig: (update) => {
            slos$.next(update.slos);
            showAllGroupByInstances$.next(update.showAllGroupByInstances);
          },
        },
        {
          slos: [slos$, (value) => slos$.next(value)],
          showAllGroupByInstances: [
            showAllGroupByInstances$,
            (value) => showAllGroupByInstances$.next(value),
          ],
          ...titleManager.comparators,
        }
      );

      const fetchSubscription = fetch$(api)
        .pipe()
        .subscribe((next) => {
          reload$.next(next);
        });

      return {
        api,
        Component: () => {
          const [slos, showAllGroupByInstances] = useBatchedPublishingSubjects(
            slos$,
            showAllGroupByInstances$
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
                  <Router history={history}>
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
                  </Router>
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

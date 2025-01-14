/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  fetch$,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserHistory } from 'history';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { BurnRate } from './burn_rate';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from './constants';
import { BurnRateApi, SloBurnRateEmbeddableState } from './types';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { PluginContext } from '../../../context/plugin_context';

const getTitle = () =>
  i18n.translate('xpack.slo.burnRateEmbeddable.title', {
    defaultMessage: 'SLO Burn Rate',
  });

export const getBurnRateEmbeddableFactory = ({
  coreStart,
  pluginsStart,
  sloClient,
}: {
  coreStart: CoreStart;
  pluginsStart: SLOPublicPluginsStart;
  sloClient: SLORepositoryClient;
}) => {
  const factory: ReactEmbeddableFactory<
    SloBurnRateEmbeddableState,
    SloBurnRateEmbeddableState,
    BurnRateApi
  > = {
    type: SLO_BURN_RATE_EMBEDDABLE_ID,
    deserializeState: (state) => {
      return state.rawState as SloBurnRateEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const deps = { ...coreStart, ...pluginsStart };
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getTitle());
      const sloId$ = new BehaviorSubject(state.sloId);
      const sloInstanceId$ = new BehaviorSubject(state.sloInstanceId);
      const duration$ = new BehaviorSubject(state.duration);
      const reload$ = new Subject<boolean>();

      const api = buildApi(
        {
          ...titlesApi,
          defaultPanelTitle: defaultTitle$,
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
                sloId: sloId$.getValue(),
                sloInstanceId: sloInstanceId$.getValue(),
                duration: duration$.getValue(),
              },
            };
          },
        },
        {
          sloId: [sloId$, (value) => sloId$.next(value)],
          sloInstanceId: [sloInstanceId$, (value) => sloInstanceId$.next(value)],
          duration: [duration$, (value) => duration$.next(value)],
          ...titleComparators,
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
          const [sloId, sloInstanceId, duration] = useBatchedPublishingSubjects(
            sloId$,
            sloInstanceId$,
            duration$
          );

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);

          const queryClient = new QueryClient();

          return (
            <Router history={createBrowserHistory()}>
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
                    <BurnRate
                      sloId={sloId}
                      sloInstanceId={sloInstanceId}
                      duration={duration}
                      reloadSubject={reload$}
                    />
                  </QueryClientProvider>
                </PluginContext.Provider>
              </KibanaContextProvider>
            </Router>
          );
        },
      };
    },
  };
  return factory;
};

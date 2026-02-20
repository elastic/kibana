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
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
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
import { PluginContext } from '../../../context/plugin_context';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { SLO_ERROR_BUDGET_ID } from './constants';
import { SloErrorBudget } from './error_budget_burn_down';
import type {
  ErrorBudgetApi,
  ErrorBudgetCustomInput,
  SloErrorBudgetEmbeddableState,
} from './types';

const getErrorBudgetPanelTitle = () =>
  i18n.translate('xpack.slo.errorBudgetEmbeddable.title', {
    defaultMessage: 'SLO Error Budget burn down',
  });

export const getErrorBudgetEmbeddableFactory = ({
  coreStart,
  pluginsStart,
  sloClient,
}: {
  coreStart: CoreStart;
  pluginsStart: SLOPublicPluginsStart;
  sloClient: SLORepositoryClient;
}) => {
  const factory: EmbeddableFactory<SloErrorBudgetEmbeddableState, ErrorBudgetApi> = {
    type: SLO_ERROR_BUDGET_ID,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const deps = { ...coreStart, ...pluginsStart };
      const titleManager = initializeTitleManager(initialState);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getErrorBudgetPanelTitle());
      const sloErrorBudgetManager = initializeStateManager<ErrorBudgetCustomInput>(initialState, {
        sloId: undefined,
        sloInstanceId: undefined,
      });
      const reload$ = new Subject<boolean>();

      function serializeState() {
        return {
          ...titleManager.getLatestState(),
          ...sloErrorBudgetManager.getLatestState(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, sloErrorBudgetManager.anyStateChange$),
        getComparators: () => ({
          ...titleComparators,
          sloId: 'referenceEquality',
          sloInstanceId: 'referenceEquality',
        }),
        onReset: (lastState) => {
          sloErrorBudgetManager.reinitializeState(lastState);
          titleManager.reinitializeState(lastState);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        defaultTitle$,
        serializeState,
      });

      const fetchSubscription = fetch$(api)
        .pipe()
        .subscribe((next) => {
          reload$.next(next.isReload);
        });

      return {
        api,
        Component: () => {
          const [sloId, sloInstanceId] = useBatchedPublishingSubjects(
            sloErrorBudgetManager.api.sloId$,
            sloErrorBudgetManager.api.sloInstanceId$
          );

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);

          const queryClient = new QueryClient();

          return (
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
                  <SloErrorBudget
                    sloId={sloId}
                    sloInstanceId={sloInstanceId}
                    reloadSubject={reload$}
                  />
                </QueryClientProvider>
              </PluginContext.Provider>
            </KibanaContextProvider>
          );
        },
      };
    },
  };
  return factory;
};

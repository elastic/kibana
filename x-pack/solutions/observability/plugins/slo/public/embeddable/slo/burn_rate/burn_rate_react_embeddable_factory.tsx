/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { BurnRate } from './burn_rate';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from '../../../../common/embeddables/burn_rate/constants';
import type { BurnRateApi, BurnRateCustomState, BurnRateEmbeddableState } from './types';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import { PluginContext } from '../../../context/plugin_context';
import { ensureLicense } from '../ensure_license';

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
  const factory: EmbeddableFactory<BurnRateEmbeddableState, BurnRateApi> = {
    type: SLO_BURN_RATE_EMBEDDABLE_ID,
    buildEmbeddable: async ({
      initialState,
      finalizeApi,
      uuid,
      parentApi,
      initializeDrilldownsManager,
    }) => {
      await ensureLicense(pluginsStart.licensing);
      const deps = { ...coreStart, ...pluginsStart };
      const titleManager = initializeTitleManager(initialState);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getTitle());
      const sloBurnRateManager = initializeStateManager<BurnRateCustomState>(initialState, {
        slo_id: '',
        slo_instance_id: '*',
        duration: '',
      });
      const drilldownsManager = initializeDrilldownsManager(uuid, initialState);
      const reload$ = new Subject<boolean>();

      function serializeState(): BurnRateEmbeddableState {
        return {
          ...titleManager.getLatestState(),
          ...sloBurnRateManager.getLatestState(),
          ...drilldownsManager.getLatestState(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<BurnRateEmbeddableState>({
        uuid,
        parentApi,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          sloBurnRateManager.anyStateChange$,
          drilldownsManager.anyStateChange$
        ),
        serializeState,
        getComparators: () => ({
          ...titleComparators,
          ...drilldownsManager.comparators,
          slo_id: 'referenceEquality',
          slo_instance_id: 'referenceEquality',
          duration: 'referenceEquality',
        }),
        onReset: (lastSaved) => {
          sloBurnRateManager.reinitializeState(lastSaved);
          titleManager.reinitializeState(lastSaved);
          drilldownsManager.reinitializeState(lastSaved ?? {});
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        ...drilldownsManager.api,
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
          const [sloId, sloInstanceId, duration] = useBatchedPublishingSubjects(
            sloBurnRateManager.api.sloId$, // from slo_id key
            sloBurnRateManager.api.sloInstanceId$, // from slo_instance_id key
            sloBurnRateManager.api.duration$
          );

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
              drilldownsManager.cleanup();
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
                  <BurnRate
                    sloId={sloId}
                    sloInstanceId={sloInstanceId}
                    duration={duration}
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

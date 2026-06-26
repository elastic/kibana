/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiLoadingSpinnerProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React, { Suspense } from 'react';
import type { ExperimentalFeatures } from '../../common/config';
import { PluginContext } from '../context/plugin_context';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../types';
import type { ISloTelemetryClient } from '../services/telemetry';

interface Props {
  core: CoreStart;
  plugins: SLOPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
  experimentalFeatures: ExperimentalFeatures;
  sloClient: SLORepositoryClient;
  telemetry?: ISloTelemetryClient;
}

export type LazyWithContextProviders = ReturnType<typeof getLazyWithContextProviders>;

interface Options {
  spinnerSize?: EuiLoadingSpinnerProps['size'];
}

export const getLazyWithContextProviders =
  ({
    core,
    plugins,
    observabilityRuleTypeRegistry,
    ObservabilityPageTemplate,
    isDev,
    kibanaVersion,
    isServerless,
    experimentalFeatures,
    sloClient,
    telemetry,
  }: Props) =>
  <TElement extends React.ComponentType<any>>(
    LazyComponent: React.LazyExoticComponent<TElement>,
    options?: Options
  ): React.FunctionComponent<React.ComponentProps<TElement>> => {
    const { spinnerSize = 'xl' } = options ?? {};
    const queryClient = new QueryClient();
    const unwrappingSloClient: SLORepositoryClient = {
      fetch: (endpoint, ...args) =>
        sloClient.fetch(endpoint, ...args).then((response) => {
          if (response && typeof response === 'object') {
            const resp = response as Record<string, unknown>;
            if ('_wrapped' in resp && '_inspect' in resp) {
              return resp._wrapped as typeof response;
            }
            if ('_inspect' in resp) {
              const { _inspect, ...rest } = resp;
              return rest as typeof response;
            }
          }
          return response;
        }),
      stream: sloClient.stream,
    };
    return (props) => (
      <KibanaContextProvider
        services={{
          ...core,
          ...plugins,
          storage: new Storage(localStorage),
          isDev,
          kibanaVersion,
          isServerless,
        }}
      >
        <PluginContext.Provider
          value={{
            isDev,
            isServerless,
            observabilityRuleTypeRegistry,
            ObservabilityPageTemplate,
            experimentalFeatures,
            sloClient: unwrappingSloClient,
            telemetry,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<LoadingSpinner size={spinnerSize} />}>
              <LazyComponent {...props} />
            </Suspense>
          </QueryClientProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    );
  };

function LoadingSpinner({ size }: { size: EuiLoadingSpinnerProps['size'] }) {
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size={size} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

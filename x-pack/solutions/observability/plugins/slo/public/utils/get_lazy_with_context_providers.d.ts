import type { EuiLoadingSpinnerProps } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import type { ExperimentalFeatures } from '../../common/config';
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
export declare const getLazyWithContextProviders: ({ core, plugins, observabilityRuleTypeRegistry, ObservabilityPageTemplate, isDev, kibanaVersion, isServerless, experimentalFeatures, sloClient, telemetry, }: Props) => <TElement extends React.ComponentType<any>>(LazyComponent: React.LazyExoticComponent<TElement>, options?: Options) => React.FunctionComponent<React.ComponentProps<TElement>>;
export {};

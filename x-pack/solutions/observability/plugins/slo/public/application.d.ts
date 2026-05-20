import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import React from 'react';
import type { ExperimentalFeatures } from '../common/config';
import type { SLOPublicPluginsStart, SLORepositoryClient } from './types';
import type { ISloTelemetryClient } from './services/telemetry';
interface Props {
    core: CoreStart;
    plugins: SLOPublicPluginsStart;
    appMountParameters: AppMountParameters;
    observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
    ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
    usageCollection: UsageCollectionSetup;
    isDev?: boolean;
    kibanaVersion: string;
    isServerless?: boolean;
    experimentalFeatures: ExperimentalFeatures;
    sloClient: SLORepositoryClient;
    telemetry?: ISloTelemetryClient;
}
export declare const renderApp: ({ core, plugins, appMountParameters, ObservabilityPageTemplate, usageCollection, isDev, kibanaVersion, isServerless, observabilityRuleTypeRegistry, experimentalFeatures, sloClient, telemetry, }: Props) => () => void;
export {};

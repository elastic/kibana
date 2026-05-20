import type { AppMountParameters } from '@kbn/core/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import type { ExperimentalFeatures } from '../../common/config';
import type { SLORepositoryClient } from '../types';
import type { ISloTelemetryClient } from '../services/telemetry';
export interface PluginContextValue {
    isDev?: boolean;
    isServerless?: boolean;
    appMountParameters?: AppMountParameters;
    observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
    ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
    experimentalFeatures?: ExperimentalFeatures;
    sloClient: SLORepositoryClient;
    telemetry?: ISloTelemetryClient;
}
export declare const PluginContext: import("react").Context<PluginContextValue | null>;

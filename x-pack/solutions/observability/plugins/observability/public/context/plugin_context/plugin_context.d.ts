import type { AppMountParameters } from '@kbn/core/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import type { ConfigSchema } from '../../plugin';
export interface PluginContextValue {
    isDev?: boolean;
    config: ConfigSchema;
    appMountParameters?: AppMountParameters;
    observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
    ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
}
export declare const PluginContext: import("react").Context<PluginContextValue>;

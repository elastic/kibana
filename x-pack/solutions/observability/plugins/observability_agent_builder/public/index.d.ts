import type { PluginInitializerContext } from '@kbn/core/public';
import type { ObservabilityAgentBuilderPlugin } from './plugin';
export { OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID, OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID, OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID, OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID, OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID, OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID, OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID, OBSERVABILITY_TRANSACTION_ATTACHMENT_TYPE_ID, OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID, } from '../common/constants';
export type { ObservabilityAgentBuilderPluginPublicSetup, ObservabilityAgentBuilderPluginPublicStart, ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStartDependencies, } from './types';
export type { AlertAiInsightProps, ErrorSampleAiInsightProps } from './components/insights';
export declare const plugin: (initializerContext: PluginInitializerContext) => ObservabilityAgentBuilderPlugin;

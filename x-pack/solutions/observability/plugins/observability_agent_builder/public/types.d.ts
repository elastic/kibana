import type { ComponentType } from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { AlertAiInsightProps, ErrorSampleAiInsightProps } from './components/insights';
export interface ObservabilityAgentBuilderPluginPublicSetup {
}
export interface ObservabilityAgentBuilderPluginPublicStart {
    getAlertAIInsight: () => ComponentType<AlertAiInsightProps>;
    getErrorSampleAIInsight: () => ComponentType<ErrorSampleAiInsightProps>;
}
export interface ObservabilityAgentBuilderPluginSetupDependencies {
}
export interface ObservabilityAgentBuilderPluginStartDependencies {
    discoverShared: DiscoverSharedPublicStart;
    agentBuilder: AgentBuilderPluginStart;
    inference: InferencePublicStart;
    licensing: LicensingPluginStart;
}

import type { InferenceClient, InferenceConnector } from '@kbn/inference-common';
import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
import { type AiInsightResult } from './types';
export interface GetLogAiInsightsParams {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    inferenceClient: InferenceClient;
    connectorId: string;
    connector: InferenceConnector;
    request: KibanaRequest;
    esClient: IScopedClusterClient;
    logger: Logger;
    index?: string;
    id?: string;
    fields?: Record<string, unknown>;
}
export declare function getLogAiInsights({ core, plugins, index, id, fields, esClient, inferenceClient, connectorId, connector, request, logger, }: GetLogAiInsightsParams): Promise<AiInsightResult>;

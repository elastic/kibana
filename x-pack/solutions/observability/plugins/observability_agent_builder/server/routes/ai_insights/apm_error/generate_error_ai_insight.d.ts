import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient, InferenceConnector } from '@kbn/inference-common';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../../types';
import { type AiInsightResult } from '../types';
export interface GenerateErrorAiInsightParams {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    errorId: string;
    serviceName: string;
    environment?: string;
    traceId?: string;
    start: string;
    end: string;
    logger: Logger;
    request: KibanaRequest;
    inferenceClient: BoundInferenceClient;
    connector: InferenceConnector;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}
export declare function generateErrorAiInsight({ core, plugins, errorId, serviceName, environment, start, end, logger, request, inferenceClient, connector, dataRegistry, }: GenerateErrorAiInsightParams): Promise<AiInsightResult>;

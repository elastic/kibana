import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceClient, InferenceConnector } from '@kbn/inference-common';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import { type AiInsightResult } from '../types';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../../types';
/**
 * These types are derived from the generated alerts-as-data schemas:
 * - `AlertSchema` in `kbn-alerts-as-data-utils` (see `alert_schema.ts`) which defines
 *   `kibana.alert.start` and other technical fields.
 * - `ObservabilityApmAlertSchema` in `observability_apm_schema.ts`, which adds
 *   the APM-specific fields like `service.*` and `transaction.*`.
 *
 * We only rely on these well-known keys; all other properties are treated as
 * opaque via the index signature below so this type can safely represent any
 * Observability alert document.
 */
export interface AlertDocForInsight {
    'service.name'?: string;
    'service.environment'?: string;
    'transaction.type'?: string;
    'transaction.name'?: string;
    'host.name'?: string;
    'kibana.alert.start'?: string | number;
    [key: string]: unknown;
}
interface GetAlertAiInsightParams {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    alertDoc: AlertDocForInsight;
    inferenceClient: InferenceClient;
    connectorId: string;
    connector: InferenceConnector;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    request: KibanaRequest;
    logger: Logger;
}
export declare function getAlertAiInsight({ core, plugins, alertDoc, inferenceClient, connectorId, connector, dataRegistry, request, logger, }: GetAlertAiInsightParams): Promise<AiInsightResult>;
export {};

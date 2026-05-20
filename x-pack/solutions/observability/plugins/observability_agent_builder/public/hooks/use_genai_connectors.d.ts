import type { InferenceConnector } from '@kbn/inference-common';
export interface UseGenAIConnectorsResult {
    connectors: InferenceConnector[];
    hasConnectors: boolean;
    loading: boolean;
}
export declare function useGenAIConnectors(): UseGenAIConnectorsResult;

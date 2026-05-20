import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
export declare function resolveConnectorForFeature({ searchInferenceEndpoints, featureId, request, logger, }: {
    searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
    featureId: string;
    request: KibanaRequest;
    logger: Logger;
}): Promise<{
    connectorId: string;
    connector: InferenceConnector;
}>;

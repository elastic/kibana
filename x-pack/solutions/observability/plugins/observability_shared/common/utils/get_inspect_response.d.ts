import type { KibanaRequest } from '@kbn/core/server';
import type { RequestStatus } from '@kbn/inspector-plugin/common';
import type { Request } from '@kbn/inspector-plugin/common';
import type { WrappedElasticsearchClientError } from './unwrap_es_response';
export type InspectResponse = Request[];
/**
 * Create a formatted response to be sent in the _inspect key for use in the
 * inspector.
 */
export declare function getInspectResponse({ esError, esRequestParams, esRequestStatus, esResponse, kibanaRequest, operationName, startTime, }: {
    esError: WrappedElasticsearchClientError | null;
    esRequestParams: Record<string, any>;
    esRequestStatus: RequestStatus;
    esResponse: any;
    kibanaRequest: KibanaRequest;
    operationName: string;
    startTime: number;
}): InspectResponse[0];

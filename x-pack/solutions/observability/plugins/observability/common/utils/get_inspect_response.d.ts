import type { KibanaRequest } from '@kbn/core/server';
import type { RequestStatus } from '@kbn/inspector-plugin/common';
import type { InspectResponse } from '../../typings/common';
import type { WrappedElasticsearchClientError } from './unwrap_es_response';
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

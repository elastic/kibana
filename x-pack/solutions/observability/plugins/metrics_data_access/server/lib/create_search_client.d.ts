import type { RequestHandlerContext } from '@kbn/core/server';
import type { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import type { CallWithRequestParams, InfraDatabaseSearchResponse } from './adapters/framework';
export declare const createSearchClient: (requestContext: RequestHandlerContext, framework: KibanaFramework) => <Hit = {}, Aggregation = undefined>(opts: CallWithRequestParams) => Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;

import type { KibanaRequest } from '@kbn/core/server';
import type { InspectResponse } from '@kbn/observability-shared-plugin/common';
export declare const inspectableEsQueriesMap: WeakMap<KibanaRequest<unknown, unknown, unknown, any>, InspectResponse>;

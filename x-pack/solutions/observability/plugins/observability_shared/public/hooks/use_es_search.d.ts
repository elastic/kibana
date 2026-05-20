import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchResponse } from '@kbn/es-types';
import type { IInspectorInfo } from '@kbn/data-plugin/common';
export declare const useEsSearch: <DocumentSource extends unknown, TParams extends estypes.SearchRequest>(params: TParams, fnDeps: any[], options: {
    inspector?: IInspectorInfo;
    name: string;
}) => {
    data: ESSearchResponse<DocumentSource, TParams, {
        restTotalHitsAsInt: false;
    }>;
    loading: boolean;
    error?: Error;
};
export declare function createEsParams<T extends estypes.SearchRequest>(params: T): T;

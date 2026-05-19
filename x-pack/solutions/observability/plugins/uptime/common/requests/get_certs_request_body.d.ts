import type { estypes } from '@elastic/elasticsearch';
import type { CertResult, GetCertsParams } from '../runtime_types';
import type { CertificatesResults } from '../../server/legacy_uptime/lib/requests/get_certs';
export declare const DEFAULT_SORT = "not_after";
export declare const DEFAULT_DIRECTION = "asc";
export declare const DEFAULT_SIZE = 20;
export declare const DEFAULT_FROM = "now-20m";
export declare const DEFAULT_TO = "now";
export declare const getCertsRequestBody: ({ monitorIds, pageIndex, search, notValidBefore, notValidAfter, size, to, from, sortBy, direction, filters, }: GetCertsParams) => {
    from: number;
    size: number;
    sort: estypes.SortCombinations[];
    query: {
        bool: {
            filter: estypes.QueryDslQueryContainer;
            minimum_should_match?: number | undefined;
            should?: {
                multi_match: {
                    query: string;
                    type: "phrase_prefix";
                    fields: string[];
                };
            }[] | undefined;
        };
    };
    _source: string[];
    collapse: {
        field: string;
        inner_hits: {
            _source: {
                includes: string[];
            };
            collapse: {
                field: string;
            };
            name: string;
            sort: {
                'monitor.id': "asc";
            }[];
        };
    };
    aggs: {
        total: {
            cardinality: {
                field: string;
            };
        };
    };
};
export declare const processCertsResult: (result: CertificatesResults) => CertResult;

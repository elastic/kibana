import type { EsQueryConfig } from '@kbn/es-query';
import { type KQLCustomIndicator } from '@kbn/slo-schema';
export declare function getCustomKqlQueries(indicator: KQLCustomIndicator, esQueryConfig?: EsQueryConfig): {
    goodQuery: {
        bool: import("@kbn/es-query").BoolQuery;
    };
    badQuery: {
        bool: {
            filter: {
                bool: import("@kbn/es-query").BoolQuery;
            };
            must_not: {
                bool: import("@kbn/es-query").BoolQuery;
            };
        };
    };
    totalQuery: {
        bool: import("@kbn/es-query").BoolQuery;
    };
};

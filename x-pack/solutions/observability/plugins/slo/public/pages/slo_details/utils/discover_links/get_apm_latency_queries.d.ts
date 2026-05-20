import { type EsQueryConfig } from '@kbn/es-query';
import { type APMTransactionDurationIndicator } from '@kbn/slo-schema';
export declare function getApmLatencyQueries(indicator: APMTransactionDurationIndicator, esQueryConfig?: EsQueryConfig): {
    totalQuery: {
        bool: {
            filter: Record<any, any>;
        };
    };
};

import { type EsQueryConfig } from '@kbn/es-query';
import { type APMTransactionErrorRateIndicator } from '@kbn/slo-schema';
export declare function getApmAvailabilityQueries(indicator: APMTransactionErrorRateIndicator, esQueryConfig?: EsQueryConfig): {
    totalQuery: {
        bool: {
            filter: Record<string, any>[];
        };
    };
    goodQuery: {
        bool: {
            filter: Record<string, any>[];
        };
    };
    badQuery: {
        bool: {
            filter: Record<string, any>[];
        };
    };
};

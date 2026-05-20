import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EsQueryConfig } from '@kbn/es-query';
import type { CustomThresholdAlert } from '../../types';
export declare const getLogRateAnalysisEQQuery: (alert: CustomThresholdAlert, config: EsQueryConfig) => QueryDslQueryContainer | undefined;

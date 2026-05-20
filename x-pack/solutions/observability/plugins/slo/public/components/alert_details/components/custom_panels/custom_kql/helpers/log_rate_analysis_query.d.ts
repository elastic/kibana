import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { GroupingsSchema, KQLCustomIndicator } from '@kbn/slo-schema';
export declare const getESQueryForLogRateAnalysis: (params: KQLCustomIndicator["params"], groupings?: GroupingsSchema) => QueryDslQueryContainer;

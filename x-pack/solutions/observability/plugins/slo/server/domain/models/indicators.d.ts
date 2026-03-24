import type { apmTransactionDurationIndicatorSchema, apmTransactionErrorRateIndicatorSchema, indicatorSchema, indicatorTypesSchema, kqlCustomIndicatorSchema, metricCustomIndicatorSchema } from '@kbn/slo-schema';
import type * as t from 'io-ts';
type APMTransactionErrorRateIndicator = t.TypeOf<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = t.TypeOf<typeof apmTransactionDurationIndicatorSchema>;
type KQLCustomIndicator = t.TypeOf<typeof kqlCustomIndicatorSchema>;
type MetricCustomIndicator = t.TypeOf<typeof metricCustomIndicatorSchema>;
type Indicator = t.TypeOf<typeof indicatorSchema>;
type IndicatorTypes = t.TypeOf<typeof indicatorTypesSchema>;
export type { Indicator, IndicatorTypes, APMTransactionErrorRateIndicator, APMTransactionDurationIndicator, KQLCustomIndicator, MetricCustomIndicator, };

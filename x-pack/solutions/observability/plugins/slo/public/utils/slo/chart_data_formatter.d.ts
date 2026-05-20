import type { HistoricalSummaryResponse } from '@kbn/slo-schema';
import type { ChartData } from '../../typings/slo';
type DataType = 'error_budget_remaining' | 'error_budget_consumed' | 'sli_value';
export declare function formatHistoricalData(historicalSummary: HistoricalSummaryResponse[] | undefined, dataType: DataType): ChartData[];
export {};

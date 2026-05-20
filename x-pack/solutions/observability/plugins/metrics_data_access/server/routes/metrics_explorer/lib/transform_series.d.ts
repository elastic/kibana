import type { MetricsAPISeries, MetricsExplorerSeries } from '../../../../common/http_api';
export declare const transformSeries: (hasGroupBy: boolean) => (series: MetricsAPISeries) => MetricsExplorerSeries;

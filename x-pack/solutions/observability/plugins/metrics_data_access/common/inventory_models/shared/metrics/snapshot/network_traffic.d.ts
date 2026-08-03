import type { estypes } from '@elastic/elasticsearch';
import type { MetricsUIAggregation } from '../../../types';
export declare const networkTraffic: (id: string, field: string) => MetricsUIAggregation;
export declare const networkTrafficWithInterfaces: (id: string, metricField: string, interfaceField: string) => MetricsUIAggregation;
export declare const networkTrafficWithInterfacesWithFilter: (id: string, metricField: string, interfaceField: string, filter: estypes.QueryDslQueryContainer) => MetricsUIAggregation;

import type { InventoryMetricsConfig } from '../../shared/metrics/types';
import type { ContainerCharts } from './charts';
import type { ContainerFormulas } from './formulas';
import type { ContainerAggregations } from './snapshot';
export declare const metrics: InventoryMetricsConfig<ContainerAggregations, ContainerFormulas, ContainerCharts>;

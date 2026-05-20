import type { ColumnarViewModel } from '@elastic/charts';
import type { ElasticFlameGraph } from '@kbn/profiling-utils';
export declare function createColumnarViewModel(flamegraph: ElasticFlameGraph, assignColors?: boolean): ColumnarViewModel;

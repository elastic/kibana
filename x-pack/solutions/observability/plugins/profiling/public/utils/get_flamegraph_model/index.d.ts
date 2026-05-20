import type { ColumnarViewModel } from '@elastic/charts';
import type { ElasticFlameGraph } from '@kbn/profiling-utils';
import { ComparisonMode } from '../../components/normalization_menu';
interface ComparisonNode {
    FileID: string;
    FrameType: number;
    ExeFileName: string;
    AddressOrLine: number;
    FunctionName: string;
    SourceFileName: string;
    SourceLine: number;
    CountInclusive: number;
    CountExclusive: number;
    SelfAnnualCO2Kgs: number;
    TotalAnnualCO2Kgs: number;
    SelfAnnualCostUSD: number;
    TotalAnnualCostUSD: number;
}
export declare function getFlamegraphModel({ primaryFlamegraph, comparisonFlamegraph, colorSuccess, colorDanger, colorNeutral, comparisonMode, comparison, baseline, }: {
    primaryFlamegraph?: ElasticFlameGraph;
    comparisonFlamegraph?: ElasticFlameGraph;
    colorSuccess: string;
    colorDanger: string;
    colorNeutral: string;
    comparisonMode?: ComparisonMode;
    baseline?: number;
    comparison?: number;
}): {
    key: string;
    viewModel: ColumnarViewModel;
    comparisonNodesById: Record<string, ComparisonNode>;
    legendItems: Array<{
        label: string;
        color: string;
    }>;
};
export {};

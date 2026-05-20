import type { DataView } from '@kbn/data-views-plugin/common';
import type { FormulaIndexPatternColumn } from '@kbn/lens-plugin/public';
export declare function getDistributionInPercentageColumn({ label, layerId, dataView, columnFilter, formula, format, }: {
    label?: string;
    columnFilter?: string;
    layerId: string;
    dataView: DataView;
    formula?: string;
    format?: string;
}): FormulaIndexPatternColumn;

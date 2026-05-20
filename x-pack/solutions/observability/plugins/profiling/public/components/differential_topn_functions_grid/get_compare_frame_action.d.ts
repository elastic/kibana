import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import type { SelectedFrame } from '.';
import type { IFunctionRow } from '../topn_functions/utils';
interface Props {
    baseRows: IFunctionRow[];
    comparisonRows: IFunctionRow[];
    selectedFrame?: SelectedFrame;
    onClick: (selectedFrame?: SelectedFrame) => void;
}
export declare const getCompareFrameAction: ({ baseRows, comparisonRows, selectedFrame, onClick }: Props) => EuiDataGridColumnCellAction;
export {};

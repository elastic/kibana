import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React from 'react';
import type { IFunctionRow } from './utils';
interface Props {
    functionRow: IFunctionRow;
    columnId: string;
    totalCount: number;
    onFrameClick?: (functionName: string) => void;
    setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
}
export declare function FunctionRow({ functionRow, columnId, totalCount, onFrameClick, setCellProps, }: Props): React.JSX.Element | null;
export {};

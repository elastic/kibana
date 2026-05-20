import type { EuiDataGridSorting } from '@elastic/eui';
import type { TopNFunctions } from '@kbn/profiling-utils';
import type { TopNFunctionSortField } from '@kbn/profiling-utils';
import React from 'react';
import type { GridOnScrollProps } from 'react-window';
interface Props {
    topNFunctions?: TopNFunctions;
    comparisonTopNFunctions?: TopNFunctions;
    totalSeconds: number;
    isDifferentialView: boolean;
    showFullScreenSelector?: boolean;
    baselineScaleFactor?: number;
    comparisonScaleFactor?: number;
    onFrameClick?: (functionName: string) => void;
    onScroll?: (scroll: GridOnScrollProps) => void;
    showDiffColumn?: boolean;
    pageIndex: number;
    onChangePage: (nextPage: number) => void;
    sortField: TopNFunctionSortField;
    sortDirection: 'asc' | 'desc';
    onChangeSort: (sorting: EuiDataGridSorting['columns'][0]) => void;
    dataTestSubj?: string;
    isEmbedded?: boolean;
    searchFunctionName: string;
    onSearchFunctionNameChange: (functionName: string) => void;
}
export declare const TopNFunctionsGrid: ({ topNFunctions, comparisonTopNFunctions, totalSeconds, showFullScreenSelector, isDifferentialView, baselineScaleFactor, comparisonScaleFactor, onFrameClick, onScroll, showDiffColumn, pageIndex, onChangePage, sortField, sortDirection, onChangeSort, dataTestSubj, isEmbedded, searchFunctionName, onSearchFunctionNameChange, }: Props) => React.JSX.Element;
export {};

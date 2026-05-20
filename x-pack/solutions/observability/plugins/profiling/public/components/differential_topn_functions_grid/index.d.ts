import type { StackFrameMetadata, TopNFunctions } from '@kbn/profiling-utils';
import { TopNComparisonFunctionSortField, TopNFunctionSortField } from '@kbn/profiling-utils';
import React from 'react';
export declare const isComparisonColumn: (id: string) => boolean;
type SortDirection = 'asc' | 'desc';
export type OnChangeSortParams = {
    sortField: TopNFunctionSortField;
    sortDirection: SortDirection;
} | {
    comparisonSortField: TopNComparisonFunctionSortField;
    comparisonSortDirection: SortDirection;
};
export declare function getFrameIdentification(frame: StackFrameMetadata): string;
export interface SelectedFrame {
    currentFrameId?: string;
    isComparison: boolean;
}
interface Props {
    base?: TopNFunctions;
    baselineScaleFactor?: number;
    comparison?: TopNFunctions;
    comparisonScaleFactor?: number;
    onChangePage: (nextPage: number) => void;
    onChangeSort: (sorting: OnChangeSortParams) => void;
    onFrameClick?: (functionName: string) => void;
    pageIndex: number;
    sortDirection: 'asc' | 'desc';
    sortField: TopNFunctionSortField;
    comparisonSortDirection: 'asc' | 'desc';
    comparisonSortField: TopNComparisonFunctionSortField;
    totalSeconds: number;
    comparisonTotalSeconds: number;
    searchFunctionName: string;
    onSearchFunctionNameChange: (functionName: string) => void;
}
export declare function DifferentialTopNFunctionsGrid({ base, baselineScaleFactor, comparison, comparisonScaleFactor, comparisonSortDirection, comparisonSortField, comparisonTotalSeconds, onChangePage, onChangeSort, onFrameClick, pageIndex, sortDirection, sortField, totalSeconds, searchFunctionName, onSearchFunctionNameChange, }: Props): React.JSX.Element;
export {};

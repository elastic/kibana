import type { FindCompositeSLOResponse, GetCompositeSLOResponse, HistoricalSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { CompositeSloSortBy, CompositeSloSortDirection } from '../../../hooks/use_fetch_composite_slo_list';
type CompositeSLOItem = FindCompositeSLOResponse['results'][number];
interface CompositeSloTableProps {
    results: CompositeSLOItem[];
    total: number;
    page: number;
    perPage: number;
    sortBy: CompositeSloSortBy;
    sortDirection: CompositeSloSortDirection;
    isDetailsLoading: boolean;
    isHistoricalLoading: boolean;
    detailsById: Map<string, GetCompositeSLOResponse>;
    historicalSummaryById: Map<string, HistoricalSummaryResponse[]>;
    onPageChange: (pageIndex: number) => void;
    onPerPageChange: (pageSize: number) => void;
    onSortChange: (sortBy: CompositeSloSortBy, direction: CompositeSloSortDirection) => void;
    onDelete: (item: CompositeSLOItem) => void;
}
export declare function CompositeSloTable({ results, total, page, perPage, sortBy, sortDirection, isDetailsLoading, isHistoricalLoading, detailsById, historicalSummaryById, onPageChange, onPerPageChange, onSortChange, onDelete, }: CompositeSloTableProps): React.JSX.Element;
export {};

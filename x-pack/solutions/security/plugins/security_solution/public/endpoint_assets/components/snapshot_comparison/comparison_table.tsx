/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButtonIcon,
  EuiText,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import type { AssetComparison } from '../../../../common/endpoint_assets';
import { FieldDiffDisplay } from './field_diff_display';
import type { ViewMode } from './view_mode_toggle';

interface ComparisonTableProps {
  comparisons: AssetComparison[];
  viewMode: ViewMode;
  dateA: string;
  dateB: string;
  loading?: boolean;
}

const getStatusBadge = (comparison: AssetComparison) => {
  if (!comparison.exists_in_a && comparison.exists_in_b) {
    return <EuiBadge color="success">Added</EuiBadge>;
  }
  if (comparison.exists_in_a && !comparison.exists_in_b) {
    return <EuiBadge color="danger">Removed</EuiBadge>;
  }
  if (comparison.has_changes) {
    return <EuiBadge color="warning">Modified</EuiBadge>;
  }
  return <EuiBadge color="default">Unchanged</EuiBadge>;
};

export const ComparisonTable: React.FC<ComparisonTableProps> = React.memo(
  ({ comparisons, viewMode, dateA, dateB, loading = false }) => {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const toggleRowExpand = useCallback((hostId: string) => {
      setExpandedRows((prev) => {
        const next = new Set(prev);
        if (next.has(hostId)) {
          next.delete(hostId);
        } else {
          next.add(hostId);
        }
        return next;
      });
    }, []);

    const columns: Array<EuiBasicTableColumn<AssetComparison>> = useMemo(
      () => [
        {
          field: 'host_name',
          name: 'Host Name',
          width: '35%',
          render: (hostName: string) => (
            <EuiText size="s">
              <strong>{hostName}</strong>
            </EuiText>
          ),
        },
        {
          name: 'Status',
          width: '15%',
          render: (comparison: AssetComparison) => getStatusBadge(comparison),
        },
        {
          field: 'change_count',
          name: 'Changes',
          width: '15%',
          render: (changeCount: number, comparison: AssetComparison) => {
            if (!comparison.exists_in_a || !comparison.exists_in_b) {
              return <EuiText size="s">-</EuiText>;
            }
            return (
              <EuiText size="s" color={changeCount > 0 ? 'warning' : 'subdued'}>
                {changeCount}
              </EuiText>
            );
          },
        },
        {
          name: 'Details',
          width: '10%',
          actions: [
            {
              render: (comparison: AssetComparison) => {
                const isExpanded = expandedRows.has(comparison.host_id);
                return (
                  <EuiButtonIcon
                    onClick={() => toggleRowExpand(comparison.host_id)}
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                    size="s"
                  />
                );
              },
            },
          ],
        },
      ],
      [expandedRows, toggleRowExpand]
    );

    const itemIdToExpandedRowMap = useMemo(() => {
      const map: Record<string, React.ReactNode> = {};
      for (const comparison of comparisons) {
        if (expandedRows.has(comparison.host_id)) {
          map[comparison.host_id] = (
            <FieldDiffDisplay diffs={comparison.diffs} dateA={dateA} dateB={dateB} />
          );
        }
      }
      return map;
    }, [comparisons, expandedRows, dateA, dateB]);

    const handleTableChange = useCallback(
      ({ page }: CriteriaWithPagination<AssetComparison>) => {
        setPageIndex(page.index);
        setPageSize(page.size);
      },
      []
    );

    const pagination = useMemo(
      () => ({
        pageIndex,
        pageSize,
        totalItemCount: comparisons.length,
        pageSizeOptions: [10, 25, 50],
      }),
      [pageIndex, pageSize, comparisons.length]
    );

    // Get current page of items
    const pageOfItems = useMemo(() => {
      const start = pageIndex * pageSize;
      return comparisons.slice(start, start + pageSize);
    }, [comparisons, pageIndex, pageSize]);

    if (loading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (comparisons.length === 0) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 100 }}>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued">
              {viewMode === 'changes_only'
                ? 'No changes detected between the selected dates'
                : 'No assets found in either snapshot'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiBasicTable
        items={pageOfItems}
        columns={columns}
        itemId="host_id"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        pagination={pagination}
        onChange={handleTableChange}
        isExpandable
      />
    );
  }
);

ComparisonTable.displayName = 'ComparisonTable';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiBadge,
  EuiText,
  EuiIcon,
  EuiScreenReaderOnly,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import type { EuiBasicTableColumn, Pagination, CriteriaWithPagination } from '@elastic/eui';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import type { EntityType } from '../../../../../../common/api/entity_analytics';
import type { RiskSeverity } from '../../../../../../common/search_strategy';
import type { PrimaryEntity } from '../../../../../../common/api/entity_analytics/entity_store/resolution/list_primaries.gen';
import { usePrimariesQuery } from '../../hooks/use_primaries_query';
import { useExpandableRows } from './use_expandable_rows';
import { ExpandedSecondariesPanel } from './expanded_secondaries_panel';
import { RiskScoreLevel } from '../../../severity/common';
import { formatRiskScore } from '../../../../common';
import * as i18n from './translations';

// Risk data interface for type casting entity-type-specific risk fields
interface EntityRiskData {
  risk?: {
    calculated_score_norm?: number;
    calculated_level?: string;
  };
}

interface GroupedEntitiesTableProps {
  entityType: EntityType;
  skip?: boolean;
}

// Get the risk score field path based on entity type
const getRiskScoreField = (type: EntityType): string => {
  switch (type) {
    case 'user':
      return 'user.risk.calculated_score_norm';
    case 'host':
      return 'host.risk.calculated_score_norm';
    default:
      return 'entity.risk.calculated_score_norm';
  }
};

export const GroupedEntitiesTable: React.FC<GroupedEntitiesTableProps> = ({
  entityType,
  skip = false,
}) => {
  // Get the correct risk field path for this entity type
  const riskScoreField = useMemo(() => getRiskScoreField(entityType), [entityType]);

  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Sorting state - default to risk score descending (highest risk first)
  const [sorting, setSorting] = useState<{
    field: string;
    direction: 'asc' | 'desc';
  }>({
    field: getRiskScoreField(entityType),
    direction: 'desc',
  });

  // Fetch primaries data
  const { data, isLoading, isRefetching, error } = usePrimariesQuery({
    entityType,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
    sortField: sorting.field,
    sortOrder: sorting.direction,
    skip,
  });

  // Get item ID for expandable rows
  const getItemId = useCallback(
    (item: PrimaryEntity) => item.entity?.id ?? '',
    []
  );

  // Render expanded content
  const renderExpandedItem = useCallback(
    (item: PrimaryEntity) => (
      <ExpandedSecondariesPanel
        entityType={entityType}
        primaryEntityId={item.entity?.id ?? ''}
      />
    ),
    [entityType]
  );

  // Expandable rows hook
  const rows = useExpandableRows<PrimaryEntity>({
    getItemId,
    renderItem: renderExpandedItem,
  });

  // Table columns
  const columns: Array<EuiBasicTableColumn<PrimaryEntity>> = useMemo(
    () => [
      // Expander column
      {
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>{i18n.EXPAND_ROW}</span>
          </EuiScreenReaderOnly>
        ),
        render: (item: PrimaryEntity) =>
          item.resolved_count > 0 ? (
            <EuiButtonIcon
              onClick={() => rows.toggleRowExpanded(item)}
              aria-label={rows.isRowExpanded(item) ? i18n.COLLAPSE_ROW : i18n.EXPAND_ROW}
              iconType={rows.isRowExpanded(item) ? 'arrowDown' : 'arrowRight'}
            />
          ) : null,
      },
      // Name column
      {
        field: 'entity.name',
        name: i18n.COLUMN_NAME,
        width: '25%',
        sortable: true,
        render: (_: unknown, item: PrimaryEntity) => {
          const entityTypeIcon =
            entityType === 'user' ? 'user' : entityType === 'host' ? 'storage' : 'globe';
          return (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={entityTypeIcon} size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{item.entity?.name ?? '-'}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      // Source column
      {
        field: 'entity.source',
        name: i18n.COLUMN_SOURCE,
        width: '20%',
        render: (_: unknown, item: PrimaryEntity) => (
          <EuiText size="s">{item.entity?.source ?? '-'}</EuiText>
        ),
      },
      // Resolved count column
      {
        field: 'resolved_count',
        name: i18n.COLUMN_RESOLVED,
        width: '10%',
        render: (count: number) =>
          count > 0 ? (
            <EuiBadge color="hollow">{count}</EuiBadge>
          ) : (
            <EuiText size="s" color="subdued">
              -
            </EuiText>
          ),
      },
      // Risk score column - uses entity-type-specific field (user.risk or host.risk)
      {
        field: riskScoreField,
        name: i18n.COLUMN_RISK_SCORE,
        width: '15%',
        sortable: true,
        render: (_: unknown, item: PrimaryEntity) => {
          // Get risk data from entity-type-specific field (cast to access nested properties)
          const entityData = (entityType === 'user' ? item.user : item.host) as EntityRiskData | undefined;
          const score = entityData?.risk?.calculated_score_norm;
          const level = entityData?.risk?.calculated_level;
          if (score == null) return '-';
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{formatRiskScore(score)}</EuiText>
              </EuiFlexItem>
              {level && (
                <EuiFlexItem grow={false}>
                  <RiskScoreLevel severity={level as RiskSeverity} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      // Last update column
      {
        field: '@timestamp',
        name: i18n.COLUMN_LAST_UPDATE,
        width: '15%',
        sortable: true,
        render: (timestamp: string) => (
          <FormattedRelativePreferenceDate value={timestamp} />
        ),
      },
    ],
    [entityType, rows, riskScoreField]
  );

  // Handle table changes (pagination, sorting)
  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<PrimaryEntity>) => {
      if (page) {
        setPagination({
          pageIndex: page.index,
          pageSize: page.size,
        });
      }
      if (sort) {
        setSorting({
          field: sort.field as string,
          direction: sort.direction,
        });
      }
    },
    []
  );

  // Build pagination object for table
  const paginationConfig: Pagination = useMemo(
    () => ({
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      totalItemCount: data?.total ?? 0,
      pageSizeOptions: [10, 25, 50],
    }),
    [pagination.pageIndex, pagination.pageSize, data?.total]
  );

  // Loading state
  if (isLoading && !data) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ padding: 40 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>{i18n.LOADING_PRIMARIES}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Error state
  if (error) {
    return (
      <EuiCallOut
        color="danger"
        title={i18n.ERROR_LOADING_PRIMARIES}
        iconType="error"
      >
        {error.message}
      </EuiCallOut>
    );
  }

  // Empty state
  if (!data?.primaries?.length) {
    return (
      <EuiCallOut
        title={i18n.NO_PRIMARIES_FOUND}
        iconType="iInCircle"
      />
    );
  }

  return (
    <EuiBasicTable
      items={data.primaries}
      columns={columns}
      loading={isLoading || isRefetching}
      pagination={paginationConfig}
      sorting={{
        sort: {
          field: sorting.field as keyof PrimaryEntity,
          direction: sorting.direction,
        },
      }}
      onChange={onTableChange}
      itemId={getItemId}
      itemIdToExpandedRowMap={rows.itemIdToExpandedRowMap}
    />
  );
};

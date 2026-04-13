/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButtonIcon,
  type CriteriaWithPagination,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import type {
  FindCompositeSLOResponse,
  GetCompositeSLOResponse,
  HistoricalSummaryResponse,
} from '@kbn/slo-schema';
import React, { useCallback, useMemo, useState } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { displayStatus } from '../../../components/slo/slo_badges/slo_status_badge';
import type {
  CompositeSloSortBy,
  CompositeSloSortDirection,
} from '../../../hooks/use_fetch_composite_slo_list';
import { useKibana } from '../../../hooks/use_kibana';
import { usePermissions } from '../../../hooks/use_permissions';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { CompositeSloMembersTable } from './composite_slo_members_table';
import { SloSparkline } from './slo_sparkline';

type CompositeSLOItem = FindCompositeSLOResponse['results'][number];

const SORTABLE_FIELDS: Record<string, CompositeSloSortBy> = {
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

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

export function CompositeSloTable({
  results,
  total,
  page,
  perPage,
  sortBy,
  sortDirection,
  isDetailsLoading,
  isHistoricalLoading,
  detailsById,
  historicalSummaryById,
  onPageChange,
  onPerPageChange,
  onSortChange,
  onDelete,
}: CompositeSloTableProps) {
  const {
    uiSettings,
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const { data: permissions } = usePermissions();
  const hasWritePermissions = permissions?.hasAllWriteRequested === true;

  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  const toggleExpandRow = useCallback((item: CompositeSLOItem) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const expandedRows = useMemo(() => {
    const map: Record<string, React.ReactNode> = {};
    for (const id of expandedRowIds) {
      const details = detailsById.get(id);
      if (!details || !details.members?.length) {
        map[id] = (
          <EuiText size="s" color="subdued" style={{ padding: 16 }}>
            {i18n.translate('xpack.slo.compositeSloList.noMembers', {
              defaultMessage: 'No member SLI data available',
            })}
          </EuiText>
        );
      } else {
        map[id] = (
          <CompositeSloMembersTable members={details.members} percentFormat={percentFormat} />
        );
      }
    }
    return map;
  }, [expandedRowIds, detailsById, percentFormat]);

  const columns: Array<EuiBasicTableColumn<CompositeSLOItem>> = useMemo(
    () => [
      {
        width: '40px',
        isExpander: true,
        render: (item: CompositeSLOItem) => {
          const isExpanded = expandedRowIds.has(item.id);
          return (
            <EuiButtonIcon
              data-test-subj={`compositeSloExpandRow-${item.id}`}
              onClick={() => toggleExpandRow(item)}
              aria-label={
                isExpanded
                  ? i18n.translate('xpack.slo.compositeSloList.collapseRow', {
                      defaultMessage: 'Collapse',
                    })
                  : i18n.translate('xpack.slo.compositeSloList.expandRow', {
                      defaultMessage: 'Expand',
                    })
              }
              iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            />
          );
        },
      },
      {
        field: 'summary.status',
        name: i18n.translate('xpack.slo.compositeSloList.columns.status', {
          defaultMessage: 'Status',
        }),
        width: '100px',
        render: (_: unknown, item: CompositeSLOItem) => {
          const details = detailsById.get(item.id);
          if (!details) {
            return <EuiSkeletonText lines={1} />;
          }
          const { status } = details.summary;
          const statusInfo = displayStatus[status as keyof typeof displayStatus];
          return statusInfo ? (
            <EuiBadge color={statusInfo.badgeColor}>{statusInfo.displayText}</EuiBadge>
          ) : null;
        },
      },
      {
        field: 'name',
        name: i18n.translate('xpack.slo.compositeSloList.columns.name', {
          defaultMessage: 'Name',
        }),
        truncateText: true,
        sortable: true,
      },
      {
        field: 'tags',
        name: i18n.translate('xpack.slo.compositeSloList.columns.tags', {
          defaultMessage: 'Tags',
        }),
        render: (tags: string[]) => (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'members',
        name: i18n.translate('xpack.slo.compositeSloList.columns.members', {
          defaultMessage: 'Members',
        }),
        width: '90px',
        render: (members: CompositeSLOItem['members']) => members.length,
      },
      {
        field: 'objective',
        name: i18n.translate('xpack.slo.compositeSloList.columns.objective', {
          defaultMessage: 'Objective',
        }),
        width: '100px',
        render: (objective: CompositeSLOItem['objective']) =>
          numeral(objective.target).format('0[.][000]%'),
      },
      {
        field: 'summary.sliValue',
        name: i18n.translate('xpack.slo.compositeSloList.columns.sliValue', {
          defaultMessage: 'SLI value',
        }),
        width: '100px',
        render: (_: unknown, item: CompositeSLOItem) => {
          const details = detailsById.get(item.id);
          if (!details) {
            return <EuiSkeletonText lines={1} />;
          }
          return details.summary.status === 'NO_DATA'
            ? NOT_AVAILABLE_LABEL
            : numeral(details.summary.sliValue).format(percentFormat);
        },
      },
      {
        name: i18n.translate('xpack.slo.compositeSloList.columns.historicalSli', {
          defaultMessage: 'Historical SLI',
        }),
        width: '80px',
        render: (item: CompositeSLOItem) => {
          const historicalData = historicalSummaryById.get(item.id);
          const details = detailsById.get(item.id);
          const isFailed =
            details?.summary.status === 'VIOLATED' || details?.summary.status === 'DEGRADING';
          return (
            <SloSparkline
              chart="line"
              id={`composite-historical-sli-${item.id}`}
              state={isFailed ? 'error' : 'success'}
              data={formatHistoricalData(historicalData, 'sli_value')}
              isLoading={isHistoricalLoading}
            />
          );
        },
      },
      {
        field: 'summary.errorBudget.remaining',
        name: i18n.translate('xpack.slo.compositeSloList.columns.budgetRemaining', {
          defaultMessage: 'Budget remaining',
        }),
        width: '140px',
        render: (_: unknown, item: CompositeSLOItem) => {
          const details = detailsById.get(item.id);
          if (!details) {
            return <EuiSkeletonText lines={1} />;
          }
          return details.summary.status === 'NO_DATA'
            ? NOT_AVAILABLE_LABEL
            : numeral(details.summary.errorBudget.remaining).format(percentFormat);
        },
      },
      {
        field: 'timeWindow',
        name: i18n.translate('xpack.slo.compositeSloList.columns.timeWindow', {
          defaultMessage: 'Time window',
        }),
        width: '120px',
        render: (timeWindow: Record<string, unknown>) => {
          const duration = String(timeWindow.duration);
          return `${duration} (${timeWindow.type})`;
        },
      },
      {
        name: i18n.translate('xpack.slo.compositeSloList.columns.actions', {
          defaultMessage: 'Actions',
        }),
        width: '80px',
        actions: [
          {
            name: i18n.translate('xpack.slo.compositeSloList.actions.edit', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate('xpack.slo.compositeSloList.actions.editDescription', {
              defaultMessage: 'Edit this composite SLO',
            }),
            icon: 'pencil',
            type: 'icon',
            enabled: () => hasWritePermissions,
            onClick: (item: CompositeSLOItem) => {
              navigateToUrl(basePath.prepend(paths.sloCompositeEdit(item.id)));
            },
            'data-test-subj': 'compositeSloEditAction',
          },
          {
            name: i18n.translate('xpack.slo.compositeSloList.actions.delete', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate('xpack.slo.compositeSloList.actions.deleteDescription', {
              defaultMessage: 'Delete this composite SLO',
            }),
            icon: 'trash',
            type: 'icon',
            color: 'danger',
            enabled: () => hasWritePermissions,
            onClick: (item: CompositeSLOItem) => {
              onDelete(item);
            },
            'data-test-subj': 'compositeSloDeleteAction',
          },
        ],
      },
    ],
    [
      basePath,
      detailsById,
      expandedRowIds,
      hasWritePermissions,
      historicalSummaryById,
      isHistoricalLoading,
      navigateToUrl,
      percentFormat,
      toggleExpandRow,
      onDelete,
    ]
  );

  return (
    <EuiBasicTable
      data-test-subj="compositeSloList"
      items={results}
      columns={columns}
      itemId="id"
      itemIdToExpandedRowMap={expandedRows}
      rowHeader="name"
      loading={isDetailsLoading}
      sorting={{
        sort: {
          field: sortBy as keyof CompositeSLOItem,
          direction: sortDirection,
        },
      }}
      pagination={{
        pageIndex: page,
        pageSize: perPage,
        totalItemCount: total,
        pageSizeOptions: [10, 25, 50],
      }}
      onChange={({ page: pagination, sort }: CriteriaWithPagination<CompositeSLOItem>) => {
        if (pagination) {
          onPageChange(pagination.index);
          onPerPageChange(pagination.size);
        }
        if (sort) {
          const mappedField = SORTABLE_FIELDS[sort.field as string];
          if (mappedField) {
            onSortChange(mappedField, sort.direction);
          }
        }
      }}
      noItemsMessage={i18n.translate('xpack.slo.compositeSloList.noItems', {
        defaultMessage: 'No composite SLOs found',
      })}
    />
  );
}

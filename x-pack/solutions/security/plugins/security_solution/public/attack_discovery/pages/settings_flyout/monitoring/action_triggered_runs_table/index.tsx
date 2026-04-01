/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiToolTip,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { FormattedDate } from '@kbn/i18n-react';

import type { ActionTriggeredGeneration } from '../types';
import { StatusBadge } from './get_status_badge';
import * as i18n from './translations';

interface ActionTriggeredRunsTableProps {
  items: ActionTriggeredGeneration[];
  onPageChange: (page: { index: number; size: number }) => void;
  onViewDetails: (item: ActionTriggeredGeneration) => void;
  pageIndex: number;
  pageSize: number;
  total: number;
}

const ActionTriggeredRunsTableComponent: React.FC<ActionTriggeredRunsTableProps> = ({
  items,
  onPageChange,
  onViewDetails,
  pageIndex,
  pageSize,
  total,
}) => {
  const columns: Array<EuiBasicTableColumn<ActionTriggeredGeneration>> = useMemo(
    () => [
      {
        dataType: 'date' as const,
        field: 'timestamp',
        name: i18n.COLUMN_TIMESTAMP,
        render: (timestamp: string) => (
          <FormattedDate value={new Date(timestamp)} year="numeric" month="short" day="2-digit" />
        ),
        sortable: false,
        width: '25%',
      },
      {
        field: 'source_metadata.rule_name',
        name: i18n.COLUMN_RULE_NAME,
        render: (_: unknown, item: ActionTriggeredGeneration) =>
          item.source_metadata?.rule_name ?? '—',
        sortable: false,
        truncateText: true,
      },
      {
        field: 'connector_id',
        name: i18n.COLUMN_CONNECTOR,
        sortable: false,
        truncateText: true,
        width: '20%',
      },
      {
        field: 'status',
        name: i18n.COLUMN_STATUS,
        render: (status: ActionTriggeredGeneration['status']) => <StatusBadge status={status} />,
        sortable: false,
        width: '15%',
      },
      {
        actions: [
          {
            render: (item: ActionTriggeredGeneration) => (
              <EuiToolTip content={i18n.VIEW_DETAILS} disableScreenReaderOutput position="top">
                <EuiButtonIcon
                  aria-label={i18n.VIEW_DETAILS}
                  data-test-subj={`viewDetails-${item.execution_uuid}`}
                  iconType="inspect"
                  onClick={() => onViewDetails(item)}
                />
              </EuiToolTip>
            ),
          },
        ],
        name: '',
        width: '48px',
      },
    ],
    [onViewDetails]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      pageSizeOptions: [10, 20, 50],
      totalItemCount: total,
    }),
    [pageIndex, pageSize, total]
  );

  const handleTableChange = useCallback(
    ({ page }: CriteriaWithPagination<ActionTriggeredGeneration>) => {
      onPageChange({ index: page.index, size: page.size });
    },
    [onPageChange]
  );

  return (
    <EuiBasicTable
      columns={columns}
      data-test-subj="actionTriggeredRunsTable"
      items={items}
      onChange={handleTableChange}
      pagination={pagination}
      tableCaption={i18n.TABLE_CAPTION}
    />
  );
};

ActionTriggeredRunsTableComponent.displayName = 'ActionTriggeredRunsTable';

export const ActionTriggeredRunsTable = React.memo(ActionTriggeredRunsTableComponent);

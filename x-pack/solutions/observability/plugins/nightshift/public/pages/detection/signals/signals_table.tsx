/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiLink,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import type { Detection } from '@kbn/significant-events-schema';
import React, { useMemo } from 'react';
import { useFormatTimestamp } from '../../../hooks/use_format_timestamp';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { getChangePointLabel } from '../../../common/change_point';
import { DetectionDiscoveryStatus } from '../../../components/entities/detection/detection_discovery_status';
import {
  CHANGE_LABEL,
  DISCOVERY_COLUMN_LABEL,
  DISCOVERY_COLUMN_TOOLTIP,
  LOADING_SIGNALS_MESSAGE,
  RULE_COLUMN_LABEL,
  SOURCE_COLUMN_LABEL,
  TABLE_CAPTION,
  TIMESTAMP_COLUMN_LABEL,
} from './translations';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export interface SignalsTableProps {
  signals: Detection[];
  total: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  selectedSignalId?: string;
  getSourceTitle: (sourceId: string) => string;
  onSignalClick: (signal: Detection) => void;
  onPageChange: (page: number, perPage: number) => void;
  onOpenLinkMount: (
    signalId: string,
    element: HTMLAnchorElement | HTMLButtonElement | null
  ) => void;
}

export const SignalsTable = ({
  signals,
  total,
  page,
  perPage,
  isLoading,
  selectedSignalId,
  getSourceTitle,
  onSignalClick,
  onPageChange,
  onOpenLinkMount,
}: SignalsTableProps): React.ReactElement => {
  const formatTimestamp = useFormatTimestamp();
  const columns = useMemo<Array<EuiBasicTableColumn<Detection>>>(
    () => [
      {
        field: 'rule_name',
        name: RULE_COLUMN_LABEL,
        render: (_ruleName: string | undefined, signal: Detection) => (
          <EuiLink
            onClick={(event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
              event.stopPropagation();
              onSignalClick(signal);
            }}
            ref={(element) => onOpenLinkMount(signal.detection_id, element)}
            data-test-subj={`nightshiftSignalRule-${signal.detection_id}`}
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SIGNAL,
              element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_SIGNALS_TABLE,
            })}
          >
            {signal.rule_name ?? signal.rule_uuid}
          </EuiLink>
        ),
      },
      {
        field: 'change_point_type',
        name: CHANGE_LABEL,
        width: '140px',
        render: (changePointType: Detection['change_point_type']) => (
          <EuiBadge color="hollow">{getChangePointLabel(changePointType)}</EuiBadge>
        ),
      },
      {
        field: 'source_id',
        name: SOURCE_COLUMN_LABEL,
        width: '140px',
        render: (sourceId: string) => (
          <EuiBadge color="hollow">{getSourceTitle(sourceId)}</EuiBadge>
        ),
      },
      {
        field: '@timestamp',
        name: TIMESTAMP_COLUMN_LABEL,
        width: '200px',
        render: (timestamp: string) => formatTimestamp(timestamp),
      },
      {
        field: 'processed',
        name: DISCOVERY_COLUMN_LABEL,
        nameTooltip: { content: DISCOVERY_COLUMN_TOOLTIP },
        width: '110px',
        render: (_processed: boolean, signal: Detection) => (
          <DetectionDiscoveryStatus detection={signal} />
        ),
      },
    ],
    [formatTimestamp, getSourceTitle, onOpenLinkMount, onSignalClick]
  );

  return (
    <EuiBasicTable<Detection>
      data-test-subj="nightshiftDetectionSignalsTable"
      tableCaption={TABLE_CAPTION}
      itemId="detection_id"
      items={signals}
      columns={columns}
      loading={isLoading}
      pagination={{
        pageIndex: page - 1,
        pageSize: perPage,
        totalItemCount: total,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
      }}
      onChange={({ page: nextPage }: CriteriaWithPagination<Detection>) => {
        if (nextPage) {
          onPageChange(nextPage.index + 1, nextPage.size);
        }
      }}
      rowProps={(signal) => ({
        isSelected: signal.detection_id === selectedSignalId,
        'data-test-subj': `nightshiftDetectionSignalRow-${signal.detection_id}`,
        onClick: () => onSignalClick(signal),
      })}
      noItemsMessage={isLoading ? LOADING_SIGNALS_MESSAGE : ''}
    />
  );
};

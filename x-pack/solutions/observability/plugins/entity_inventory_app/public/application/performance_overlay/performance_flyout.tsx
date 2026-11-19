/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { ENTITY_INVENTORY_EBT_ACTIONS, ENTITY_INVENTORY_EBT_ELEMENTS } from '../../ebt_constants';
import { formatMs } from './format';
import { ListCallDetail } from './list_call_detail';
import type { RecordedCall, RecordedCallStatus } from './performance_recorder';
import {
  CLEAR_BUTTON,
  FLYOUT_TITLE,
  HISTORY_COLUMNS,
  HISTORY_TITLE,
  NO_CALLS,
  NO_LIST_SELECTED,
  STATUS_LABELS,
} from './translations';

const STATUS_COLORS: Readonly<Record<RecordedCallStatus, string>> = {
  ok: 'success',
  error: 'danger',
  aborted: 'subdued',
};

const HISTORY_TABLE_COLUMNS: Array<EuiBasicTableColumn<RecordedCall>> = [
  {
    field: 'startedAt',
    name: HISTORY_COLUMNS.time,
    render: (startedAt: number) => new Date(startedAt).toLocaleTimeString(),
  },
  { field: 'route', name: HISTORY_COLUMNS.route },
  {
    field: 'status',
    name: HISTORY_COLUMNS.status,
    render: (status: RecordedCallStatus, { errorMessage }: RecordedCall) => (
      <EuiHealth color={STATUS_COLORS[status]} title={errorMessage ?? undefined}>
        {STATUS_LABELS[status]}
      </EuiHealth>
    ),
  },
  {
    field: 'browserMs',
    name: HISTORY_COLUMNS.browserMs,
    align: 'right',
    render: (browserMs: number) => formatMs(browserMs),
  },
  {
    field: 'serverMs',
    name: HISTORY_COLUMNS.serverMs,
    align: 'right',
    render: (serverMs: number | null) => formatMs(serverMs),
  },
];

export interface PerformanceFlyoutProps {
  calls: readonly RecordedCall[];
  onClear: () => void;
  onClose: () => void;
}

/** The recent API calls, and the breakdown of the selected `_list` call (the latest by default). */
export const PerformanceFlyout = ({ calls, onClear, onClose }: PerformanceFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'entityInventoryPerformanceFlyoutTitle' });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected =
    calls.find(({ id, list }) => id === selectedId && list !== null) ??
    calls.find(({ list }) => list !== null);

  return (
    <EuiFlyout
      size="l"
      ownFocus={false}
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="entityInventoryPerformanceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 id={titleId}>{FLYOUT_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={onClear}
              data-test-subj="entityInventoryPerformanceClear"
              {...getEbtProps({
                action: ENTITY_INVENTORY_EBT_ACTIONS.CLEAR_PERFORMANCE_HISTORY,
                element: ENTITY_INVENTORY_EBT_ELEMENTS.PERFORMANCE_OVERLAY,
              })}
            >
              {CLEAR_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {selected?.list ? (
          <ListCallDetail call={selected} list={selected.list} />
        ) : (
          <EuiText size="s" color="subdued">
            {NO_LIST_SELECTED}
          </EuiText>
        )}
        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3>{HISTORY_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable<RecordedCall>
          tableCaption={HISTORY_TITLE}
          items={[...calls]}
          itemId="id"
          columns={HISTORY_TABLE_COLUMNS}
          noItemsMessage={NO_CALLS}
          compressed
          data-test-subj="entityInventoryPerformanceHistory"
          rowProps={({ id, list }: RecordedCall) => ({
            isSelected: id === selected?.id,
            onClick: list ? () => setSelectedId(id) : undefined,
            'data-test-subj': 'entityInventoryPerformanceHistoryRow',
          })}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

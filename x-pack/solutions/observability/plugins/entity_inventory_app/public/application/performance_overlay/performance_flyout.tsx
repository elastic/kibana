/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  useResizeObserver,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { ENTITY_INVENTORY_EBT_ACTIONS, ENTITY_INVENTORY_EBT_ELEMENTS } from '../../ebt_constants';
import { EMPTY_VALUE, formatMs, formatRequest } from './format';
import { ListCallDetail } from './list_call_detail';
import {
  FixedColumnWidthsContext,
  HISTORY_COLUMN_WIDTHS,
  TIME_COLUMN_WIDTH,
  fixedWidth,
  hasRoomForFixedColumnWidths,
} from './column_widths';
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

// About six compressed rows and the header before the history scrolls.
const HISTORY_VISIBLE_ROWS = 7;

const numberCss = css`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

// A narrow flyout cuts a long request short instead of running it into the status, but always
// keeps a few characters of it, so the link that selects the call never collapses to an ellipsis.
const requestLinkCss = css`
  display: inline-block;
  min-width: 8ch;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
`;

/** The history columns; a `_list` call's request selects it, from the keyboard too. */
const historyColumns = (
  onSelect: (id: number) => void,
  isFixed: boolean
): Array<EuiBasicTableColumn<RecordedCall>> => [
  {
    field: 'startedAt',
    name: HISTORY_COLUMNS.time,
    width: fixedWidth(isFixed, TIME_COLUMN_WIDTH),
    render: (startedAt: number) => (
      <span css={numberCss}>{new Date(startedAt).toLocaleTimeString()}</span>
    ),
  },
  {
    field: 'route',
    name: HISTORY_COLUMNS.request,
    truncateText: true,
    render: (route: string, { id, list }: RecordedCall) =>
      list ? (
        <EuiLink
          css={requestLinkCss}
          title={formatRequest(route)}
          onClick={() => onSelect(id)}
          data-test-subj="entityInventoryPerformanceHistorySelect"
          {...getEbtProps({
            action: ENTITY_INVENTORY_EBT_ACTIONS.SELECT_PERFORMANCE_CALL,
            element: ENTITY_INVENTORY_EBT_ELEMENTS.PERFORMANCE_OVERLAY,
          })}
        >
          {formatRequest(route)}
        </EuiLink>
      ) : (
        formatRequest(route)
      ),
  },
  {
    field: 'status',
    name: HISTORY_COLUMNS.status,
    width: fixedWidth(isFixed, HISTORY_COLUMN_WIDTHS.status),
    render: (status: RecordedCallStatus, { errorMessage }: RecordedCall) => (
      <EuiHealth color={STATUS_COLORS[status]} title={errorMessage ?? undefined}>
        {STATUS_LABELS[status]}
      </EuiHealth>
    ),
  },
  {
    field: 'browserMs',
    name: HISTORY_COLUMNS.browser,
    width: fixedWidth(isFixed, HISTORY_COLUMN_WIDTHS.browser),
    align: 'right',
    render: (browserMs: number) => <span css={numberCss}>{formatMs(browserMs)}</span>,
  },
  {
    field: 'serverMs',
    name: HISTORY_COLUMNS.server,
    width: fixedWidth(isFixed, HISTORY_COLUMN_WIDTHS.server),
    align: 'right',
    render: (serverMs: number | null) => <span css={numberCss}>{formatMs(serverMs)}</span>,
  },
  {
    name: HISTORY_COLUMNS.errors,
    width: fixedWidth(isFixed, HISTORY_COLUMN_WIDTHS.errors),
    align: 'right',
    render: ({ list }: RecordedCall) => {
      if (list === null) {
        return EMPTY_VALUE;
      }
      const { length } = list.errors;
      return length > 0 ? <EuiBadge color="danger">{length}</EuiBadge> : length;
    },
  },
];

export interface PerformanceFlyoutProps {
  calls: readonly RecordedCall[];
  onClear: () => void;
  onClose: () => void;
}

/** The recent API calls, and the breakdown of the selected `_list` call (the latest by default). */
export const PerformanceFlyout = ({ calls, onClear, onClose }: PerformanceFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'entityInventoryPerformanceFlyoutTitle' });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const { width: bodyWidth } = useResizeObserver(body, 'width');
  const isFixed = hasRoomForFixedColumnWidths(bodyWidth);
  const selected =
    calls.find(({ id, list }) => id === selectedId && list !== null) ??
    calls.find(({ list }) => list !== null);

  const historyCss = css`
    max-height: calc(${euiTheme.size.xl} * ${HISTORY_VISIBLE_ROWS});
    overflow-y: auto;
  `;

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
        <div ref={setBody}>
          <FixedColumnWidthsContext.Provider value={isFixed}>
            {selected?.list ? (
              <ListCallDetail key={selected.id} call={selected} list={selected.list} />
            ) : (
              <EuiText size="s" color="subdued">
                {NO_LIST_SELECTED}
              </EuiText>
            )}
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>{HISTORY_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <div css={historyCss}>
              <EuiBasicTable<RecordedCall>
                tableCaption={HISTORY_TITLE}
                items={[...calls]}
                itemId="id"
                columns={historyColumns(setSelectedId, isFixed)}
                noItemsMessage={NO_CALLS}
                compressed
                data-test-subj="entityInventoryPerformanceHistory"
                rowProps={({ id }: RecordedCall) => ({
                  isSelected: id === selected?.id,
                  'data-test-subj': 'entityInventoryPerformanceHistoryRow',
                })}
              />
            </div>
          </FixedColumnWidthsContext.Provider>
        </div>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

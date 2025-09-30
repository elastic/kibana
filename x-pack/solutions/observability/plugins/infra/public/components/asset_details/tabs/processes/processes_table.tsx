/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTable,
  EuiTableHeader,
  EuiTableBody,
  EuiTableHeaderCell,
  EuiTableRowCell,
  useEuiTheme,
  SortableProperties,
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiTableRow } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { EuiProgress } from '@elastic/eui';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { FORMATTERS } from '../../../../../common/formatters';
import type { SortBy } from '../../hooks/use_process_list';
import type { Process } from './types';
import { ProcessRow } from './process_row';
import { ProcessesEmptyMessage } from './processes_empty_message';
import { StateBadge } from './state_badge';
import { STATE_ORDER } from './states';
import type { ProcessListAPIResponse } from '../../../../../common/http_api';
import { MetricNotAvailableExplanationTooltip } from '../../components/metric_not_available_explanation';
import { NOT_AVAILABLE_LABEL } from '../../translations';

interface ProcessColumn {
  field: keyof Process;
  name: string;
  sortable: boolean;
  render?: Function;
  width?: string | number;
  textOnly?: boolean;
  truncateText?: boolean;
  align?: typeof RIGHT_ALIGNMENT | typeof LEFT_ALIGNMENT;
}

interface TableProps {
  processList: ProcessListAPIResponse['processList'];
  currentTime: number;
  isLoading: boolean;
  sortBy: SortBy;
  error?: string;
  setSortBy: (s: SortBy) => void;
  clearSearchBar: () => void;
  schema: DataSchemaFormat | null;
}

function useSortableProperties<T>(
  sortablePropertyItems: Array<{
    name: string;
    getValue: (obj: T) => any;
    isAscending: boolean;
  }>,
  defaultSortProperty: string,
  callback: (s: SortBy) => void
) {
  const [sortableProperties] = useState<SortableProperties<T>>(
    new SortableProperties(sortablePropertyItems, defaultSortProperty)
  );

  return {
    updateSortableProperties: useCallback(
      (property: any) => {
        sortableProperties.sortOn(property);
        callback(omit(sortableProperties.getSortedProperty(), 'getValue'));
      },
      [sortableProperties, callback]
    ),
  };
}

export const ProcessesTable = ({
  processList,
  currentTime,
  isLoading,
  sortBy,
  error,
  setSortBy,
  clearSearchBar,
  schema,
}: TableProps) => {
  const { updateSortableProperties } = useSortableProperties<Process>(
    [
      {
        name: 'startTime',
        getValue: (item: any) => Date.parse(item.startTime),
        isAscending: true,
      },
      {
        name: 'cpu',
        getValue: (item: any) => item.cpu,
        isAscending: false,
      },
      {
        name: 'memory',
        getValue: (item: any) => item.memory,
        isAscending: false,
      },
    ],
    'cpu',
    setSortBy
  );

  const currentItems = useMemo(
    () =>
      processList.sort(
        (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)
      ) as Process[],
    [processList]
  );

  const hideStateColumn = schema === 'semconv';
  const visibleColumns = useMemo(
    () => (hideStateColumn ? columns.filter((col) => col.field !== 'state') : columns),
    [hideStateColumn]
  );

  if (!isLoading && currentItems.length === 0)
    return <ProcessesEmptyMessage schema={schema} clearSearchBar={clearSearchBar} />;

  return (
    <EuiTable data-test-subj="infraAssetDetailsProcessesTable" responsiveBreakpoint={false}>
      <EuiTableHeader>
        <EuiTableHeaderCell width={24} />
        {visibleColumns.map((column) => (
          <EuiTableHeaderCell
            key={`${String(column.field)}-header`}
            align={column.align ?? LEFT_ALIGNMENT}
            width={column.width}
            onSort={column.sortable ? () => updateSortableProperties(column.field) : undefined}
            isSorted={sortBy.name === column.field}
            isSortAscending={sortBy.name === column.field && sortBy.isAscending}
            data-test-subj={`${String(column.field)}-header`}
          >
            {column.name}
          </EuiTableHeaderCell>
        ))}
      </EuiTableHeader>

      <EuiTableBody
        css={css`
          position: relative;
          & .euiTableCellContent {
            padding-top: 0;
            padding-bottom: 0;
          }
        `}
      >
        {isLoading && (
          <EuiTableRow>
            <EuiTableRowCell>
              <EuiProgress size="xs" color="primary" position="absolute" />
            </EuiTableRowCell>
          </EuiTableRow>
        )}
        {isLoading && currentItems.length === 0 && !error && (
          <ProcessesTableMessage visibleColumnsCount={visibleColumns.length}>
            <FormattedMessage
              id="xpack.infra.assetDetails.processes.loading"
              defaultMessage="Loading..."
            />
          </ProcessesTableMessage>
        )}

        {error ? (
          <ProcessesTableMessage visibleColumnsCount={visibleColumns.length}>
            <EuiIcon type="minusInCircle" color="danger" /> {error}
          </ProcessesTableMessage>
        ) : (
          <ProcessesTableBody
            items={currentItems}
            currentTime={currentTime}
            visibleColumns={visibleColumns}
          />
        )}
      </EuiTableBody>
    </EuiTable>
  );
};

interface ProcessesTableMessageProps {
  children: React.ReactNode;
  visibleColumnsCount: number;
}

const ProcessesTableMessage = ({ children, visibleColumnsCount }: ProcessesTableMessageProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiTableRow>
      <EuiTableRowCell
        data-test-subj="infraAssetDetailsProcessesSearchInputError"
        style={{
          paddingTop: `${euiTheme.size.s}`,
          paddingBottom: `${euiTheme.size.s}`,
        }}
        align="center"
        colSpan={visibleColumnsCount + 1}
        mobileOptions={{ width: '100%' }}
        textOnly={true}
      >
        {children}
      </EuiTableRowCell>
    </EuiTableRow>
  );
};

interface TableBodyProps {
  items: Process[];
  currentTime: number;
  visibleColumns: ProcessColumn[];
}

const ProcessesTableBody = ({ items, currentTime, visibleColumns }: TableBodyProps) => (
  <>
    {items.map((item, i) => {
      const cells = visibleColumns.map((column) => (
        <EuiTableRowCell
          key={`${String(column.field)}-${i}`}
          mobileOptions={{ header: column.name }}
          align={column.align ?? LEFT_ALIGNMENT}
          textOnly={column.textOnly ?? true}
          truncateText={column.truncateText}
        >
          {column.render ? column.render(item[column.field], currentTime) : item[column.field]}
        </EuiTableRowCell>
      ));
      return (
        <ProcessRow
          cells={cells}
          item={item}
          key={`row-${i}`}
          supportAIAssistant={true}
          visibleColumnsCount={visibleColumns.length}
        />
      );
    })}
  </>
);

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = ONE_MINUTE * 60;
const RuntimeCell = ({ startTime, currentTime }: { startTime: number; currentTime: number }) => {
  const runtimeLength = currentTime - startTime;
  let remainingRuntimeMS = runtimeLength;
  const runtimeHours = Math.floor(remainingRuntimeMS / ONE_HOUR);
  remainingRuntimeMS -= runtimeHours * ONE_HOUR;
  const runtimeMinutes = Math.floor(remainingRuntimeMS / ONE_MINUTE);
  remainingRuntimeMS -= runtimeMinutes * ONE_MINUTE;
  const runtimeSeconds = Math.floor(remainingRuntimeMS / 1000);
  remainingRuntimeMS -= runtimeSeconds * 1000;

  const runtimeDisplayHours = runtimeHours ? `${runtimeHours}:` : '';
  const runtimeDisplayMinutes = runtimeMinutes < 10 ? `0${runtimeMinutes}:` : `${runtimeMinutes}:`;
  const runtimeDisplaySeconds = runtimeSeconds < 10 ? `0${runtimeSeconds}` : runtimeSeconds;

  return <>{`${runtimeDisplayHours}${runtimeDisplayMinutes}${runtimeDisplaySeconds}`}</>;
};

const columnLabelCPU = i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelCPU', {
  defaultMessage: 'CPU',
});

const columns: ProcessColumn[] = [
  {
    field: 'state',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelState', {
      defaultMessage: 'State',
    }),
    sortable: false,
    render: (state: string) => <StateBadge state={state} />,
    width: 84,
    textOnly: false,
  },
  {
    field: 'command',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelCommand', {
      defaultMessage: 'Command',
    }),
    sortable: false,
    width: '40%',
    truncateText: true,
    render: (command: string) => <CodeLine command={command} />,
  },
  {
    field: 'startTime',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelTime', {
      defaultMessage: 'Time',
    }),
    align: RIGHT_ALIGNMENT,
    sortable: true,
    render: (startTime: number, currentTime: number) => (
      <RuntimeCell startTime={startTime} currentTime={currentTime} />
    ),
  },
  {
    field: 'cpu',
    name: columnLabelCPU,
    sortable: true,
    render: (value: number | null) =>
      value === null ? (
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>{NOT_AVAILABLE_LABEL}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <MetricNotAvailableExplanationTooltip metricName={columnLabelCPU} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        FORMATTERS.percent(value)
      ),
  },
  {
    field: 'memory',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelMemory', {
      defaultMessage: 'Mem.',
    }),
    sortable: true,
    render: (value: number | null) =>
      value === null ? (
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>{NOT_AVAILABLE_LABEL}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <MetricNotAvailableExplanationTooltip
              metricName={i18n.translate('xpack.infra.metrics.nodeDetails.processes.memory', {
                defaultMessage: 'memory',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        FORMATTERS.percent(value)
      ),
  },
];

const CodeLine = ({ command }: { command: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        white-space: pre;
        overflow: hidden;
        text-overflow: ellipsis;
      `}
    >
      <EuiCode
        transparentBackground
        css={css`
          color: ${euiTheme.colors.textParagraph};
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {command}
      </EuiCode>
    </div>
  );
};

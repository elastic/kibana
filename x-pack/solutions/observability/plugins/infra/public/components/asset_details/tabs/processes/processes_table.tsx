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
  EuiEmptyPrompt,
  useEuiTheme,
  EuiText,
  EuiLink,
  EuiButton,
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
import { FORMATTERS } from '../../../../../common/formatters';
import type { SortBy } from '../../hooks/use_process_list';
import type { Process } from './types';
import { ProcessRow } from './process_row';
import { StateBadge } from './state_badge';
import { STATE_ORDER } from './states';
import type { ProcessListAPIResponse } from '../../../../../common/http_api';
import { MetricNotAvailableExplanationTooltip } from '../../components/metric_not_available_explanation';
import { NOT_AVAILABLE_LABEL } from '../../translations';

interface TableProps {
  processList: ProcessListAPIResponse['processList'];
  currentTime: number;
  isLoading: boolean;
  sortBy: SortBy;
  error?: string;
  setSortBy: (s: SortBy) => void;
  clearSearchBar: () => void;
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

  if (!isLoading && currentItems.length === 0)
    return (
      <EuiEmptyPrompt
        iconType="search"
        titleSize="s"
        title={
          <strong>
            <FormattedMessage
              id="xpack.infra.metrics.nodeDetails.noProcesses"
              defaultMessage="No processes found"
            />
          </strong>
        }
        body={
          <EuiText size="s">
            <FormattedMessage
              id="xpack.infra.metrics.nodeDetails.noProcessesBody"
              defaultMessage="Try modifying your filter. Only processes that are within the configured {metricbeatDocsLink} will display here."
              values={{
                metricbeatDocsLink: (
                  <EuiLink
                    data-test-subj="infraProcessesTableTopNByCpuOrMemoryLink"
                    href="https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-module-system.html"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.metrics.nodeDetails.noProcessesBody.metricbeatDocsLinkText"
                      defaultMessage="top N by CPU or Memory"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        }
        actions={
          <EuiButton
            data-test-subj="infraProcessesTableClearFiltersButton"
            onClick={clearSearchBar}
          >
            <FormattedMessage
              id="xpack.infra.metrics.nodeDetails.noProcessesClearFilters"
              defaultMessage="Clear filters"
            />
          </EuiButton>
        }
      />
    );

  return (
    <EuiTable data-test-subj="infraAssetDetailsProcessesTable" responsiveBreakpoint={false}>
      <EuiTableHeader>
        <EuiTableHeaderCell width={24} />
        {columns.map((column) => (
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
          <ProcessesTableMessage>
            <FormattedMessage
              id="xpack.infra.assetDetails.processes.loading"
              defaultMessage="Loading..."
            />
          </ProcessesTableMessage>
        )}

        {error ? (
          <ProcessesTableMessage>
            <EuiIcon type="minusInCircle" color="danger" /> {error}
          </ProcessesTableMessage>
        ) : (
          <ProcessesTableBody items={currentItems} currentTime={currentTime} />
        )}
      </EuiTableBody>
    </EuiTable>
  );
};

interface ProcessesTableMessageProps {
  children: React.ReactNode;
}

const ProcessesTableMessage = ({ children }: ProcessesTableMessageProps) => {
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
        colSpan={columns.length + 1}
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
}

const ProcessesTableBody = ({ items, currentTime }: TableBodyProps) => (
  <>
    {items.map((item, i) => {
      const cells = columns.map((column) => (
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
      return <ProcessRow cells={cells} item={item} key={`row-${i}`} supportAIAssistant={true} />;
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

const columns: Array<{
  field: keyof Process;
  name: string;
  sortable: boolean;
  render?: Function;
  width?: string | number;
  textOnly?: boolean;
  truncateText?: boolean;
  align?: typeof RIGHT_ALIGNMENT | typeof LEFT_ALIGNMENT;
}> = [
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

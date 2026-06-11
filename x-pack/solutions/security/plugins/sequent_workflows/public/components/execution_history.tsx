/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiBadge,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiEmptyPrompt,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';

export interface HistoryEntry {
  runId: string;
  mainWorkflowId: string;
  executionId: string;
  status: 'deploying' | 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  workflowIds: Record<string, string>;
  baseUrl: string;
}

interface ExecutionHistoryProps {
  history: HistoryEntry[];
  activeRunId?: string;
  basePath?: string;
}

const workflowExecutionUrl = (bp: string, workflowId: string, executionId?: string) => {
  const base = `${bp}/app/workflows/${encodeURIComponent(workflowId)}`;
  if (executionId) {
    return `${base}?tab=executions&executionId=${encodeURIComponent(executionId)}`;
  }
  return `${base}?tab=executions`;
};

const statusBadge = (status: HistoryEntry['status']) => {
  switch (status) {
    case 'completed':
      return (
        <EuiBadge color="success" iconType="check">
          Completed
        </EuiBadge>
      );
    case 'failed':
      return (
        <EuiBadge color="danger" iconType="cross">
          Failed
        </EuiBadge>
      );
    case 'running':
      return (
        <EuiBadge color="warning" iconType="clock">
          Running
        </EuiBadge>
      );
    case 'deploying':
      return (
        <EuiBadge color="primary" iconType="push">
          Deploying
        </EuiBadge>
      );
    default:
      return <EuiBadge color="hollow">{status}</EuiBadge>;
  }
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
};

const formatDuration = (start: string, end?: string) => {
  if (!end) return '--';
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
  } catch {
    return '--';
  }
};

const makeColumns = (bp: string): Array<EuiBasicTableColumn<HistoryEntry>> => [
  {
    field: 'status',
    name: 'Status',
    width: '120px',
    render: (status: HistoryEntry['status']) => statusBadge(status),
  },
  {
    field: 'mainWorkflowId',
    name: 'Workflow',
    truncateText: true,
    render: (id: string, item: HistoryEntry) => (
      <EuiLink href={workflowExecutionUrl(bp, id, item.executionId)} target="_blank" external={false}>
        <EuiText size="xs" css={css`font-family: 'Roboto Mono', monospace;`}>
          {id}
        </EuiText>
      </EuiLink>
    ),
  },
  {
    field: 'executionId',
    name: 'Execution ID',
    width: '160px',
    truncateText: true,
    render: (execId: string, item: HistoryEntry) => (
      <EuiToolTip content={`Full ID: ${execId}`}>
        <EuiLink href={workflowExecutionUrl(bp, item.mainWorkflowId, execId)} target="_blank" external={false}>
          <EuiText size="xs" css={css`font-family: 'Roboto Mono', monospace;`}>
            {execId.length > 12 ? `${execId.substring(0, 12)}...` : execId}
          </EuiText>
        </EuiLink>
      </EuiToolTip>
    ),
  },
  {
    field: 'startedAt',
    name: 'Started',
    width: '170px',
    render: (val: string) => (
      <EuiText size="xs" color="subdued">
        {formatTime(val)}
      </EuiText>
    ),
  },
  {
    name: 'Duration',
    width: '100px',
    render: (item: HistoryEntry) => (
      <EuiText size="xs" color="subdued">
        {formatDuration(item.startedAt, item.finishedAt)}
      </EuiText>
    ),
  },
  {
    field: 'baseUrl',
    name: 'Runner URL',
    width: '180px',
    truncateText: true,
    render: (url: string) => (
      <EuiToolTip content={url}>
        <EuiText size="xs" color="subdued">
          {url}
        </EuiText>
      </EuiToolTip>
    ),
  },
  {
    name: 'Actions',
    width: '60px',
    actions: [
      {
        name: 'Open',
        description: 'Open workflow in Kibana',
        icon: 'popout',
        type: 'icon',
        onClick: (item: HistoryEntry) => {
          window.open(workflowExecutionUrl(bp, item.mainWorkflowId, item.executionId), '_blank');
        },
      },
    ],
  },
];

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ history, activeRunId, basePath = '' }) => {
  if (history.length === 0) {
    return (
      <EuiPanel
        hasBorder
        paddingSize="l"
        css={css`border-radius: 12px;`}
      >
        <EuiEmptyPrompt
          iconType="listAdd"
          iconColor="subdued"
          title={<h3>No executions yet</h3>}
          titleSize="xs"
          body="Click Run to create and execute a workflow. Each execution will appear here with a link to its details."
        />
      </EuiPanel>
    );
  }

  const itemId = (item: HistoryEntry) => item.runId;

  const rowProps = (item: HistoryEntry) => ({
    css: css`
      ${item.runId === activeRunId
        ? 'background: rgba(0, 119, 204, 0.05); border-left: 3px solid #0077CC;'
        : ''}
    `,
  });

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      css={css`border-radius: 12px;`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>Execution History</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{history.length}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={history}
        columns={makeColumns(basePath)}
        itemId={itemId}
        rowProps={rowProps}
        tableLayout="auto"
        noItemsMessage="No executions yet"
      />
    </EuiPanel>
  );
};

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

const MONO_FONT = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";

const workflowExecutionUrl = (bp: string, workflowId: string, executionId?: string) => {
  const base = `${bp}/app/workflows/${encodeURIComponent(workflowId)}`;
  if (executionId) {
    return `${base}?tab=executions&executionId=${encodeURIComponent(executionId)}`;
  }
  return `${base}?tab=executions`;
};

const statusColors: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  completed: {
    dot: '#3fd97a',
    text: '#3fd97a',
    bg: 'rgba(63, 217, 122, 0.1)',
    border: 'rgba(63, 217, 122, 0.25)',
  },
  failed: {
    dot: '#ff5d62',
    text: '#ff5d62',
    bg: 'rgba(255, 93, 98, 0.1)',
    border: 'rgba(255, 93, 98, 0.25)',
  },
  running: {
    dot: '#ffb13b',
    text: '#ffb13b',
    bg: 'rgba(255, 177, 59, 0.1)',
    border: 'rgba(255, 177, 59, 0.25)',
  },
  deploying: {
    dot: '#5ca8ff',
    text: '#5ca8ff',
    bg: 'rgba(92, 168, 255, 0.1)',
    border: 'rgba(92, 168, 255, 0.25)',
  },
};

const StatusPill: React.FC<{ status: HistoryEntry['status'] }> = ({ status }) => {
  const cfg = statusColors[status] ?? statusColors.running;
  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: ${MONO_FONT};
        font-size: 10px;
        font-weight: 600;
        padding: 4px 9px;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        background: ${cfg.bg};
        color: ${cfg.text};
        border: 1px solid ${cfg.border};
      `}
    >
      <span
        css={css`
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${cfg.dot};
          box-shadow: 0 0 8px ${cfg.dot};
          display: inline-block;
        `}
      />
      {status}
    </span>
  );
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
    width: '130px',
    render: (status: HistoryEntry['status']) => <StatusPill status={status} />,
  },
  {
    field: 'mainWorkflowId',
    name: 'Workflow',
    truncateText: true,
    render: (id: string, item: HistoryEntry) => (
      <EuiLink href={workflowExecutionUrl(bp, id, item.executionId)} target="_blank" external={false}>
        <EuiText
          size="xs"
          css={css`
            font-family: ${MONO_FONT};
            font-size: 12px;
            color: #2ee6c4;
          `}
        >
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
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 12px;
            `}
          >
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
      <EuiText
        size="xs"
        css={css`
          font-family: ${MONO_FONT};
          font-size: 11px;
          color: #5c6878;
        `}
      >
        {formatTime(val)}
      </EuiText>
    ),
  },
  {
    name: 'Duration',
    width: '100px',
    render: (item: HistoryEntry) => (
      <EuiText
        size="xs"
        css={css`
          font-family: ${MONO_FONT};
          font-size: 11px;
          color: #8a97a8;
        `}
      >
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
        <EuiText
          size="xs"
          css={css`
            font-family: ${MONO_FONT};
            font-size: 11px;
            color: #5c6878;
          `}
        >
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
        css={css`
          border-radius: 10px;
          border-color: #222c39;
          background: #11171f;
        `}
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
        ? 'background: rgba(46, 230, 196, 0.04); border-left: 3px solid #2ee6c4;'
        : ''}
      &:hover {
        background: #161d28;
      }
    `,
  });

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      css={css`
        border-radius: 10px;
        border-color: #222c39;
        background: #11171f;
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" color="#2ee6c4" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            css={css`
              font-family: ${MONO_FONT};
              font-weight: 700;
              color: #e7eef6;
            `}
          >
            Execution History
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span
            css={css`
              font-family: ${MONO_FONT};
              font-size: 10px;
              background: #1c2531;
              padding: 2px 8px;
              border-radius: 10px;
              color: #5c6878;
              border: 1px solid #222c39;
            `}
          >
            {history.length}
          </span>
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

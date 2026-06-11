/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useEffect } from 'react';
import {
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error';
}

interface ExecutionLogProps {
  logs: LogEntry[];
}

const isStepEntry = (msg: string) =>
  msg.includes(' — completed') || msg.includes(' — running') || msg.includes(' — failed');

const parseStep = (msg: string) => {
  const sep = msg.lastIndexOf(' — ');
  if (sep === -1) return null;
  return { label: msg.substring(0, sep), status: msg.substring(sep + 3) };
};

const stepStatusConfig: Record<string, { color: string; badgeColor: string; icon: string }> = {
  completed: { color: '#00BFB3', badgeColor: '#e6f9f7', icon: 'checkInCircleFilled' },
  running: { color: '#0077CC', badgeColor: '#e6f0fa', icon: 'playFilled' },
  failed: { color: '#BD271E', badgeColor: '#fce8e6', icon: 'crossInCircleFilled' },
};

const systemLevelConfig: Record<string, { color: string; icon: string }> = {
  info: { color: '#98A2B3', icon: 'dot' },
  success: { color: '#00BFB3', icon: 'checkInCircleFilled' },
  error: { color: '#BD271E', icon: 'warning' },
};

const StepLogEntry: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const parsed = parseStep(entry.message);
  if (!parsed) return null;
  const cfg = stepStatusConfig[parsed.status] ?? stepStatusConfig.running;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      css={css`
        padding: 6px 10px;
        border-radius: 6px;
        background: ${cfg.badgeColor}11;
        border-left: 3px solid ${cfg.color};
        transition: all 0.3s ease;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type={cfg.icon} color={cfg.color} size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="xs">
          <strong>{parsed.label}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge
          color={cfg.color}
          css={css`
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          `}
        >
          {parsed.status}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          css={css`
            color: #98a2b3;
            font-family: 'Roboto Mono', 'SF Mono', monospace;
            font-size: 11px;
          `}
        >
          {entry.timestamp}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SystemLogEntry: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const cfg = systemLevelConfig[entry.level];

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      css={css`
        padding: 2px 10px 2px 13px;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={cfg.icon}
          color={cfg.color}
          size="s"
          css={css`
            opacity: 0.7;
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText
          size="xs"
          css={css`
            color: ${cfg.color};
            font-size: 12px;
          `}
        >
          {entry.message}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          css={css`
            color: #69707d;
            font-family: 'Roboto Mono', 'SF Mono', monospace;
            font-size: 11px;
          `}
        >
          {entry.timestamp}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const FinalLogEntry: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const isSuccess = entry.level === 'success';

  return (
    <div
      css={css`
        padding: 8px 12px;
        border-radius: 6px;
        background: ${isSuccess ? 'rgba(0, 191, 179, 0.08)' : 'rgba(189, 39, 30, 0.08)'};
        border: 1px solid ${isSuccess ? 'rgba(0, 191, 179, 0.3)' : 'rgba(189, 39, 30, 0.3)'};
        text-align: center;
      `}
    >
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={isSuccess ? 'checkInCircleFilled' : 'crossInCircleFilled'}
            color={isSuccess ? '#00BFB3' : '#BD271E'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong style={{ color: isSuccess ? '#00BFB3' : '#BD271E' }}>{entry.message}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              color: #98a2b3;
              font-family: 'Roboto Mono', 'SF Mono', monospace;
            `}
          >
            {entry.timestamp}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const isFinalEntry = (entry: LogEntry) =>
  entry.message === 'All steps completed successfully' ||
  entry.message.startsWith('Workflow execution ');

export const ExecutionLog: React.FC<ExecutionLogProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (logs.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      css={css`
        max-height: 320px;
        overflow-y: auto;
        padding: 4px 0;
      `}
    >
      {logs.map((entry, i) => (
        <React.Fragment key={i}>
          {isFinalEntry(entry) ? (
            <FinalLogEntry entry={entry} />
          ) : isStepEntry(entry.message) ? (
            <StepLogEntry entry={entry} />
          ) : (
            <SystemLogEntry entry={entry} />
          )}
          {i < logs.length - 1 && <EuiSpacer size="xs" />}
        </React.Fragment>
      ))}
    </div>
  );
};

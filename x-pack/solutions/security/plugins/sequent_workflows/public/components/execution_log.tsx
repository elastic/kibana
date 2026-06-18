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
  EuiSpacer,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error';
}

interface ExecutionLogProps {
  logs: LogEntry[];
}

const MONO_FONT = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const isStepEntry = (msg: string) =>
  msg.includes(' — completed') || msg.includes(' — running') || msg.includes(' — failed');

const parseStep = (msg: string) => {
  const sep = msg.lastIndexOf(' — ');
  if (sep === -1) return null;
  return { label: msg.substring(0, sep), status: msg.substring(sep + 3) };
};

const stepStatusConfig: Record<string, { color: string; prefix: string }> = {
  completed: { color: '#3fd97a', prefix: '✓' },
  running: { color: '#ffb13b', prefix: '●' },
  failed: { color: '#ff5d62', prefix: '✕' },
};

const systemLevelConfig: Record<string, { color: string; prefix: string }> = {
  info: { color: '#9fb3c8', prefix: '›' },
  success: { color: '#3fd97a', prefix: '✓' },
  error: { color: '#ff5d62', prefix: '!' },
};

const StepLogEntry: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const parsed = parseStep(entry.message);
  if (!parsed) return null;
  const cfg = stepStatusConfig[parsed.status] ?? stepStatusConfig.running;

  return (
    <div
      css={css`
        padding: 5px 14px;
        border-left: 3px solid ${cfg.color};
        margin-left: 0;
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 11px;
              color: #5c6878;
            `}
          >
            {entry.timestamp}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 11.5px;
              color: ${cfg.color};
              font-weight: 600;
            `}
          >
            {cfg.prefix}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 11.5px;
              color: #e7eef6;
            `}
          >
            {parsed.label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              color: ${cfg.color};
              font-weight: 600;
            `}
          >
            {parsed.status}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const SystemLogEntry: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const cfg = systemLevelConfig[entry.level];

  return (
    <div
      css={css`
        padding: 3px 14px 3px 17px;
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 11px;
              color: #5c6878;
            `}
          >
            {entry.timestamp}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 11.5px;
              color: ${cfg.color};
            `}
          >
            {cfg.prefix}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 11.5px;
              color: ${cfg.color};
              opacity: 0.85;
            `}
          >
            {entry.message}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const FinalLogEntry: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const isSuccess = entry.level === 'success';
  const color = isSuccess ? '#3fd97a' : '#ff5d62';

  return (
    <div
      css={css`
        padding: 10px 14px;
        margin-top: 4px;
        border-radius: 6px;
        background: ${isSuccess ? 'rgba(63, 217, 122, 0.06)' : 'rgba(255, 93, 98, 0.06)'};
        border: 1px solid ${isSuccess ? 'rgba(63, 217, 122, 0.25)' : 'rgba(255, 93, 98, 0.25)'};
        text-align: center;
      `}
    >
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={isSuccess ? 'checkInCircleFilled' : 'crossInCircleFilled'}
            color={color}
            size="m"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            css={css`
              font-family: ${MONO_FONT};
              font-weight: 700;
              color: ${color};
            `}
          >
            {entry.message}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 10px;
              color: #5c6878;
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

const TerminalHeader: React.FC = () => (
  <div
    css={css`
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 14px;
      border-bottom: 1px solid #222c39;
      background: #11171f;
      border-radius: 10px 10px 0 0;
    `}
  >
    <div
      css={css`
        display: flex;
        gap: 6px;
      `}
    >
      <span
        css={css`
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ff5d62;
          display: block;
        `}
      />
      <span
        css={css`
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffb13b;
          display: block;
        `}
      />
      <span
        css={css`
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3fd97a;
          display: block;
        `}
      />
    </div>
    <EuiText
      size="xs"
      css={css`
        font-family: ${MONO_FONT};
        font-size: 11px;
        color: #5c6878;
      `}
    >
      live logs · workflow execution
    </EuiText>
    <div css={css`flex: 1;`} />
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <span
          css={css`
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #3fd97a;
            box-shadow: 0 0 8px #3fd97a;
            display: block;
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          css={css`
            font-family: ${MONO_FONT};
            font-size: 10px;
            color: #3fd97a;
          `}
        >
          auto-scroll
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);

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
      css={css`
        background: #05080c;
        border: 1px solid #222c39;
        border-radius: 10px;
        overflow: hidden;
      `}
    >
      <TerminalHeader />
      <div
        ref={scrollRef}
        css={css`
          max-height: 340px;
          overflow-y: auto;
          padding: 14px 0;
          &::-webkit-scrollbar {
            width: 9px;
          }
          &::-webkit-scrollbar-track {
            background: transparent;
          }
          &::-webkit-scrollbar-thumb {
            background: #2e3a4b;
            border-radius: 9px;
          }
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
        <span
          css={css`
            display: inline-block;
            width: 7px;
            height: 13px;
            background: #2ee6c4;
            margin-left: 17px;
            margin-top: 4px;
            vertical-align: middle;
            animation: ${blink} 1s steps(2) infinite;
          `}
        />
      </div>
    </div>
  );
};

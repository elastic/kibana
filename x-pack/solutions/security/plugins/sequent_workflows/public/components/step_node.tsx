/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiText,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  workflowId?: string;
  executionId?: string;
}

const pulseRunning = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 177, 59, 0.18); }
  50% { box-shadow: 0 0 0 7px rgba(255, 177, 59, 0); }
`;

const pulseCompleted = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(63, 217, 122, 0.2); }
  50% { box-shadow: 0 0 0 6px rgba(63, 217, 122, 0); }
`;

const pulseRed = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 93, 98, 0.2); }
  50% { box-shadow: 0 0 0 6px rgba(255, 93, 98, 0); }
`;

const MONO_FONT = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";

const statusConfig: Record<
  StepStatus,
  {
    color: string;
    borderColor: string;
    icon: React.ReactNode;
    stateLabel: string;
    statePrefix: string;
  }
> = {
  pending: {
    color: '#5c6878',
    borderColor: '#222c39',
    icon: <EuiIcon type="dot" color="subdued" size="s" />,
    stateLabel: 'pending',
    statePrefix: '○',
  },
  running: {
    color: '#ffb13b',
    borderColor: 'rgba(255, 177, 59, 0.5)',
    icon: <EuiLoadingSpinner size="s" />,
    stateLabel: 'running',
    statePrefix: '●',
  },
  completed: {
    color: '#3fd97a',
    borderColor: 'rgba(63, 217, 122, 0.45)',
    icon: <EuiIcon type="checkInCircleFilled" color="#3fd97a" size="s" />,
    stateLabel: 'completed',
    statePrefix: '✓',
  },
  failed: {
    color: '#ff5d62',
    borderColor: 'rgba(255, 93, 98, 0.5)',
    icon: <EuiIcon type="crossInCircleFilled" color="#ff5d62" size="s" />,
    stateLabel: 'failed',
    statePrefix: '✕',
  },
};

interface StepNodeProps {
  step: WorkflowStep;
  basePath?: string;
}

const workflowExecutionUrl = (basePath: string, workflowId: string, executionId?: string) => {
  const base = `${basePath}/app/workflows/${encodeURIComponent(workflowId)}`;
  if (executionId) {
    return `${base}?tab=executions&executionId=${encodeURIComponent(executionId)}`;
  }
  return `${base}?tab=executions`;
};

export const StepNode: React.FC<StepNodeProps> = ({ step, basePath = '' }) => {
  const cfg = statusConfig[step.status];
  const hasLink = step.workflowId && step.status !== 'pending';

  const content = (
    <EuiPanel
      paddingSize="s"
      hasBorder
      css={css`
        min-width: 140px;
        max-width: 172px;
        border-color: ${cfg.borderColor};
        border-width: 1.5px;
        border-radius: 9px;
        background: linear-gradient(160deg, #1c2531, #11171f);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        transition: all 0.2s ease;
        cursor: ${hasLink ? 'pointer' : 'default'};
        opacity: ${step.status === 'pending' ? 0.55 : 1};
        ${step.status === 'running' ? `animation: ${pulseRunning} 1.8s infinite;` : ''}
        ${step.status === 'completed'
          ? `animation: ${pulseCompleted} 1s ease-in-out 1;`
          : ''}
        ${step.status === 'failed'
          ? `animation: ${pulseRed} 1s ease-in-out 1;`
          : ''}
        &:hover {
          border-color: ${step.status === 'pending' ? '#2e3a4b' : cfg.color};
          ${hasLink ? 'transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4);' : ''}
        }
      `}
    >
      {/* State label */}
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        justifyContent="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>{cfg.icon}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              color: ${cfg.color};
              font-weight: 600;
              line-height: 1;
            `}
          >
            {cfg.statePrefix} {cfg.stateLabel}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Step name */}
      <EuiText
        size="s"
        css={css`
          font-family: ${MONO_FONT};
          font-weight: 700;
          font-size: 13px;
          text-align: center;
          margin-top: 6px;
          color: #e7eef6;
        `}
      >
        {step.label}
      </EuiText>

      {/* Description / route */}
      <EuiText
        size="xs"
        css={css`
          font-family: ${MONO_FONT};
          font-size: 10px;
          text-align: center;
          margin-top: 4px;
          color: #5c6878;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        {step.description.replace(/^(GET|POST|Poll)\s+/, '').substring(0, 24)}
      </EuiText>

      {hasLink && (
        <EuiText
          size="xs"
          css={css`
            text-align: center;
            margin-top: 4px;
          `}
        >
          <EuiLink
            href={workflowExecutionUrl(basePath, step.workflowId!, step.executionId)}
            target="_blank"
            css={css`
              font-family: ${MONO_FONT};
              font-size: 9px;
              color: #2ee6c4;
            `}
          >
            view exec ↗
          </EuiLink>
        </EuiText>
      )}
    </EuiPanel>
  );

  return (
    <EuiToolTip
      content={
        <>
          <strong>{step.label}</strong>
          <br />
          {step.description}
          {step.workflowId && (
            <>
              <br />
              <em>Workflow: {step.workflowId}</em>
            </>
          )}
        </>
      }
      position="top"
    >
      {content}
    </EuiToolTip>
  );
};

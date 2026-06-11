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

const pulseGreen = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 191, 179, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(0, 191, 179, 0); }
`;

const pulseAmber = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 167, 0, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(245, 167, 0, 0); }
`;

const pulseRed = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(189, 39, 30, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(189, 39, 30, 0); }
`;

const statusConfig: Record<
  StepStatus,
  {
    color: string;
    borderColor: string;
    icon: React.ReactNode;
    label: string;
    badgeColor: string;
  }
> = {
  pending: {
    color: '#98A2B3',
    borderColor: '#D3DAE6',
    icon: <EuiIcon type="dot" color="subdued" size="m" />,
    label: 'Pending',
    badgeColor: '#F5F7FA',
  },
  running: {
    color: '#F5A700',
    borderColor: '#F5A700',
    icon: <EuiLoadingSpinner size="s" />,
    label: 'Running',
    badgeColor: '#FFF9E8',
  },
  completed: {
    color: '#00BFB3',
    borderColor: '#00BFB3',
    icon: <EuiIcon type="checkInCircleFilled" color="#00BFB3" size="m" />,
    label: 'Success',
    badgeColor: '#E6FFF8',
  },
  failed: {
    color: '#BD271E',
    borderColor: '#BD271E',
    icon: <EuiIcon type="crossInCircleFilled" color="#BD271E" size="m" />,
    label: 'Failed',
    badgeColor: '#FFF1F0',
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
        min-width: 154px;
        max-width: 180px;
        border-color: ${cfg.borderColor};
        border-width: 2px;
        border-radius: 8px;
        background: ${cfg.badgeColor};
        transition: all 0.4s ease;
        cursor: ${hasLink ? 'pointer' : 'default'};
        ${step.status === 'running' ? `animation: ${pulseAmber} 2s ease-in-out infinite;` : ''}
        ${step.status === 'completed'
          ? `animation: ${pulseGreen} 1s ease-in-out 1;
             box-shadow: 0 0 12px rgba(0, 191, 179, 0.15);`
          : ''}
        ${step.status === 'failed'
          ? `animation: ${pulseRed} 1s ease-in-out 1;
             box-shadow: 0 0 12px rgba(189, 39, 30, 0.12);`
          : ''}
        &:hover {
          ${hasLink ? 'transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08);' : ''}
        }
      `}
    >
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
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: ${cfg.color};
              font-weight: 600;
              line-height: 1;
            `}
          >
            {cfg.label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiText
        size="s"
        css={css`
          font-weight: 700;
          text-align: center;
          margin-top: 4px;
          font-family: 'Inter', -apple-system, sans-serif;
        `}
      >
        {step.label}
      </EuiText>

      {hasLink && (
        <EuiText
          size="xs"
          css={css`
            text-align: center;
            margin-top: 2px;
          `}
        >
          <EuiLink
            href={workflowExecutionUrl(basePath, step.workflowId!, step.executionId)}
            target="_blank"
            css={css`
              font-size: 10px;
            `}
          >
            View execution
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

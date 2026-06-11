/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiBadge,
  EuiIcon,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { StepNode } from './step_node';
import type { WorkflowStep, StepStatus } from './step_node';

interface WorkflowDagProps {
  steps: WorkflowStep[];
  executionState?: 'idle' | 'deploying' | 'running' | 'completed' | 'failed';
  basePath?: string;
}

const flowDash = keyframes`
  to { stroke-dashoffset: -12; }
`;

const arrowColor = (fromStatus: StepStatus, toStatus: StepStatus) => {
  if (fromStatus === 'completed' && toStatus === 'completed') return '#00BFB3';
  if (fromStatus === 'failed' || toStatus === 'failed') return '#BD271E';
  if (fromStatus === 'completed' && toStatus === 'running') return '#F5A700';
  if (fromStatus === 'completed') return '#00BFB3';
  return '#D3DAE6';
};

const isAnimated = (fromStatus: StepStatus, toStatus: StepStatus) =>
  (fromStatus === 'completed' && toStatus === 'running') ||
  (fromStatus === 'running' && toStatus === 'pending');

const Arrow: React.FC<{ from: StepStatus; to: StepStatus }> = ({ from, to }) => {
  const color = arrowColor(from, to);
  const animate = isAnimated(from, to);

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      `}
    >
      <svg width="48" height="20" viewBox="0 0 48 20">
        <line
          x1="0"
          y1="10"
          x2="36"
          y2="10"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={animate ? '6 6' : 'none'}
          css={
            animate
              ? css`
                  animation: ${flowDash} 0.6s linear infinite;
                `
              : undefined
          }
        />
        <polygon points="36,5 48,10 36,15" fill={color} />
      </svg>
    </div>
  );
};

const ForkArrows: React.FC<{ from: StepStatus; toTop: StepStatus; toBottom: StepStatus }> = ({
  from,
  toTop,
  toBottom,
}) => {
  const topColor = arrowColor(from, toTop);
  const bottomColor = arrowColor(from, toBottom);
  const animateTop = isAnimated(from, toTop);
  const animateBottom = isAnimated(from, toBottom);

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        padding: 0 2px;
      `}
    >
      <svg width="48" height="72" viewBox="0 0 48 72">
        <line x1="0" y1="36" x2="16" y2="36" stroke={topColor} strokeWidth="2" />
        <line x1="16" y1="36" x2="16" y2="12" stroke={topColor} strokeWidth="2" />
        <line x1="16" y1="36" x2="16" y2="60" stroke={bottomColor} strokeWidth="2" />
        <line
          x1="16"
          y1="12"
          x2="36"
          y2="12"
          stroke={topColor}
          strokeWidth="2"
          strokeDasharray={animateTop ? '6 6' : 'none'}
          css={
            animateTop
              ? css`
                  animation: ${flowDash} 0.6s linear infinite;
                `
              : undefined
          }
        />
        <line
          x1="16"
          y1="60"
          x2="36"
          y2="60"
          stroke={bottomColor}
          strokeWidth="2"
          strokeDasharray={animateBottom ? '6 6' : 'none'}
          css={
            animateBottom
              ? css`
                  animation: ${flowDash} 0.6s linear infinite;
                `
              : undefined
          }
        />
        <polygon points="36,8 48,12 36,16" fill={topColor} />
        <polygon points="36,56 48,60 36,64" fill={bottomColor} />
      </svg>
    </div>
  );
};

const MergeArrows: React.FC<{ fromTop: StepStatus; fromBottom: StepStatus; to: StepStatus }> = ({
  fromTop,
  fromBottom,
  to,
}) => {
  const topColor = arrowColor(fromTop, to);
  const bottomColor = arrowColor(fromBottom, to);
  const merged =
    fromTop === 'completed' && fromBottom === 'completed' && to !== 'pending'
      ? '#00BFB3'
      : '#D3DAE6';

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        padding: 0 2px;
      `}
    >
      <svg width="48" height="72" viewBox="0 0 48 72">
        <line x1="0" y1="12" x2="16" y2="12" stroke={topColor} strokeWidth="2" />
        <line x1="0" y1="60" x2="16" y2="60" stroke={bottomColor} strokeWidth="2" />
        <line x1="16" y1="12" x2="16" y2="60" stroke={merged} strokeWidth="2" />
        <line x1="16" y1="36" x2="36" y2="36" stroke={merged} strokeWidth="2" />
        <polygon points="36,32 48,36 36,40" fill={merged} />
      </svg>
    </div>
  );
};

const overallBadge = (executionState?: string) => {
  switch (executionState) {
    case 'running':
    case 'deploying':
      return (
        <EuiBadge color="warning" iconType="clock">
          Running
        </EuiBadge>
      );
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
    default:
      return (
        <EuiBadge color="hollow" iconType="empty">
          Ready
        </EuiBadge>
      );
  }
};

export const WorkflowDag: React.FC<WorkflowDagProps> = ({ steps, executionState, basePath = '' }) => {
  const getStep = (id: string) => steps.find((s) => s.id === id)!;

  const healthcheck = getStep('healthcheck');
  const execLoadstar = getStep('execute_sec_loadstar');
  const pollLoadstar = getStep('poll_sec_loadstar');
  const horde = getStep('horde');
  const sepRally = getStep('sep_rally');
  const awaitChildren = getStep('await_children');
  const success = getStep('success');

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      css={css`
        border-radius: 12px;
      `}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="branch" size="l" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div>
                <EuiText size="s">
                  <strong>Workflow Pipeline</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  Sequential, parallel fan-out, then join
                </EuiText>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{overallBadge(executionState)}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <div
        css={css`
          overflow-x: auto;
          padding: 8px 0;
        `}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          responsive={false}
          wrap={false}
          css={css`
            min-width: 1100px;
          `}
        >
          <EuiFlexItem grow={false}>
            <StepNode step={healthcheck} basePath={basePath} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Arrow from={healthcheck.status} to={execLoadstar.status} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StepNode step={execLoadstar} basePath={basePath} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Arrow from={execLoadstar.status} to={pollLoadstar.status} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StepNode step={pollLoadstar} basePath={basePath} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ForkArrows
              from={pollLoadstar.status}
              toTop={horde.status}
              toBottom={sepRally.status}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <StepNode step={horde} basePath={basePath} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StepNode step={sepRally} basePath={basePath} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <MergeArrows
              fromTop={horde.status}
              fromBottom={sepRally.status}
              to={awaitChildren.status}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StepNode step={awaitChildren} basePath={basePath} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Arrow from={awaitChildren.status} to={success.status} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StepNode step={success} basePath={basePath} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );
};

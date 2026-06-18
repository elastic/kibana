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

const MONO_FONT = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";

const flowDash = keyframes`
  to { stroke-dashoffset: -12; }
`;

const arrowColor = (fromStatus: StepStatus, toStatus: StepStatus) => {
  if (fromStatus === 'completed' && toStatus === 'completed') return '#2ee6c4';
  if (fromStatus === 'failed' || toStatus === 'failed') return '#ff5d62';
  if (fromStatus === 'completed' && toStatus === 'running') return '#ffb13b';
  if (fromStatus === 'completed') return '#1aa98f';
  return '#222c39';
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
      <svg width="46" height="20" viewBox="0 0 46 20">
        <line
          x1="0"
          y1="10"
          x2="34"
          y2="10"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={animate ? '6 6' : 'none'}
          css={
            animate
              ? css`
                  animation: ${flowDash} 0.6s linear infinite;
                `
              : undefined
          }
        />
        <polygon points="34,5 46,10 34,15" fill={color} />
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
        <line x1="0" y1="36" x2="16" y2="36" stroke={topColor} strokeWidth="2.5" />
        <line x1="16" y1="36" x2="16" y2="12" stroke={topColor} strokeWidth="2.5" />
        <line x1="16" y1="36" x2="16" y2="60" stroke={bottomColor} strokeWidth="2.5" />
        <line
          x1="16"
          y1="12"
          x2="36"
          y2="12"
          stroke={topColor}
          strokeWidth="2.5"
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
          strokeWidth="2.5"
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
      ? '#2ee6c4'
      : '#222c39';

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
        <line x1="0" y1="12" x2="16" y2="12" stroke={topColor} strokeWidth="2.5" />
        <line x1="0" y1="60" x2="16" y2="60" stroke={bottomColor} strokeWidth="2.5" />
        <line x1="16" y1="12" x2="16" y2="60" stroke={merged} strokeWidth="2.5" />
        <line x1="16" y1="36" x2="36" y2="36" stroke={merged} strokeWidth="2.5" />
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
        <EuiBadge
          color="warning"
          iconType="clock"
          css={css`
            font-family: ${MONO_FONT};
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          `}
        >
          Running
        </EuiBadge>
      );
    case 'completed':
      return (
        <EuiBadge
          color="success"
          iconType="check"
          css={css`
            font-family: ${MONO_FONT};
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          `}
        >
          Completed
        </EuiBadge>
      );
    case 'failed':
      return (
        <EuiBadge
          color="danger"
          iconType="cross"
          css={css`
            font-family: ${MONO_FONT};
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          `}
        >
          Failed
        </EuiBadge>
      );
    default:
      return (
        <EuiBadge
          color="hollow"
          iconType="empty"
          css={css`
            font-family: ${MONO_FONT};
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          `}
        >
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
        border-radius: 10px;
        border-color: #222c39;
        background: radial-gradient(
            circle at center,
            rgba(46, 230, 196, 0.025),
            transparent 70%
          ),
          linear-gradient(#1c2531 1px, transparent 1px) 0 0 / 26px 26px,
          linear-gradient(90deg, #1c2531 1px, transparent 1px) 0 0 / 26px 26px,
          #0a0e13;
      `}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="branch" size="l" color="#2ee6c4" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div>
                <EuiText
                  size="s"
                  css={css`
                    font-family: ${MONO_FONT};
                    font-weight: 700;
                    color: #e7eef6;
                  `}
                >
                  Workflow Pipeline
                </EuiText>
                <EuiText
                  size="xs"
                  css={css`
                    font-family: ${MONO_FONT};
                    font-size: 10px;
                    color: #5c6878;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  `}
                >
                  sequential → parallel fan-out → join
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
          padding: 12px 0;
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

          {/* Parallel fan-out separator */}
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
                <EuiText
                  size="xs"
                  css={css`
                    font-family: ${MONO_FONT};
                    font-size: 9px;
                    color: #2ee6c4;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    text-align: center;
                    padding: 2px 0;
                  `}
                >
                  parallel
                </EuiText>
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

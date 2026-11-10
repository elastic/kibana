/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { PHISHING_EMAIL_STEPS, type PhishingStepStatus } from '../../common/workflow_content';
import * as i18n from './translations';

// Matches the node look of the Elastic Workflows visual editor
const EDGE_COLOR = '#16C5C0';
const NODE_WIDTH = 320;
const NODE_HEIGHT = 56;

interface GraphNodeProps {
  label: string;
  icon: string;
  status?: PhishingStepStatus;
}

const GraphNode: React.FC<GraphNodeProps> = ({ label, icon, status }) => {
  const { euiTheme } = useEuiTheme();
  const needsReview = status === 'needs_review';

  return (
    <div
      css={css`
        display: flex;
        width: ${NODE_WIDTH}px;
        height: ${NODE_HEIGHT}px;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: 1px solid
          ${needsReview ? euiTheme.colors.borderBaseWarning : euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${NODE_HEIGHT}px;
          flex-shrink: 0;
          background: ${needsReview
            ? euiTheme.colors.backgroundBaseWarning
            : euiTheme.colors.backgroundBaseAccentSecondary};
        `}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: ${euiTheme.colors.backgroundBasePlain};
            border: 1px solid
              ${needsReview ? euiTheme.colors.borderBaseWarning : euiTheme.colors.borderBaseSubdued};
            border-radius: ${euiTheme.border.radius.medium};
          `}
        >
          <EuiIcon type={icon} size="m" aria-hidden={true} />
        </div>
      </div>
      <div
        css={css`
          display: flex;
          flex: 1;
          align-items: center;
          gap: ${euiTheme.size.s};
          min-width: 0;
          padding: 0 ${euiTheme.size.m};
        `}
      >
        <EuiText
          size="s"
          css={css`
            flex: 1;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
          title={label}
        >
          {label}
        </EuiText>
        {status && (
          <EuiIcon
            type={needsReview ? 'warning' : 'checkCircleFill'}
            color={needsReview ? euiTheme.colors.warning : EDGE_COLOR}
            aria-label={needsReview ? i18n.NEEDS_REVIEW : i18n.MAPPED}
          />
        )}
      </div>
    </div>
  );
};

const GraphEdge: React.FC = () => (
  <div
    css={css`
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 40px;
    `}
    aria-hidden={true}
  >
    <div
      css={css`
        flex: 1;
        width: 1px;
        background: ${EDGE_COLOR};
      `}
    />
    <div
      css={css`
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 6px solid ${EDGE_COLOR};
      `}
    />
  </div>
);

// Compact overview of the whole workflow: one bar per node, the trigger
// highlighted, like the minimap in the Elastic Workflows visual editor.
export const GraphMinimap: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      role="img"
      aria-label={i18n.GRAPH_MINIMAP_LABEL}
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        width: 160px;
        height: 126px;
        @media (max-height: 700px) {
          width: 112px;
          height: 88px;
        }
        background: ${euiTheme.colors.emptyShade};
        border-radius: 4px;
        box-shadow: 0 0 2px 0 rgba(43, 57, 79, 0.16), 0 1px 4px 0 rgba(43, 57, 79, 0.06),
          0 2px 8px 0 rgba(43, 57, 79, 0.05);
      `}
      data-test-subj="workflowMigrationGraphMinimap"
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          box-sizing: border-box;
          width: calc(100% - ${euiTheme.size.base});
          height: calc(100% - ${euiTheme.size.base});
          background: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      >
        <div
          css={css`
            width: 28px;
            height: 4px;
            border-radius: 2px;
            background: ${euiTheme.colors.accent};
          `}
        />
        {PHISHING_EMAIL_STEPS.map((step) => (
          <div
            key={step.title}
            css={css`
              width: 28px;
              height: 4px;
              border-radius: 2px;
              background: ${euiTheme.colors.primary};
            `}
          />
        ))}
      </div>
    </div>
  );
};

export const WorkflowGraph: React.FC<{ maxHeight?: number }> = React.memo(({ maxHeight = 640 }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
      `}
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: ${euiTheme.size.xl} ${euiTheme.size.m} ${euiTheme.size.xxxxl};
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          background-image: radial-gradient(
            ${euiTheme.colors.borderBasePlain} 1px,
            transparent 1px
          );
          background-size: 16px 16px;
          max-height: ${maxHeight}px;
          overflow-y: auto;
        `}
        data-test-subj="workflowMigrationGraph"
      >
        <GraphNode label={i18n.GRAPH_TRIGGER_NODE} icon="bolt" />
        {PHISHING_EMAIL_STEPS.map((step) => (
          <React.Fragment key={step.title}>
            <GraphEdge />
            <GraphNode label={step.title} icon={step.icon} status={step.status} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});
WorkflowGraph.displayName = 'WorkflowGraph';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext } from 'react';
import { css, keyframes } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiText,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
import type {
  InvestigationHypothesis,
  InvestigationRecommendation,
} from '@kbn/significant-events-schema';
import type { InvestigationSubjectType } from '../../../common';
import type { DecisionTreeNodeData, DecisionTreeNodeKind } from './build_decision_graph';
import { DECISION_TREE_NODE_WIDTH, getDecisionTreeNodeWidth } from './layout_decision_graph';

export type DecisionTreeFlowNodeData = DecisionTreeNodeData & {
  isSelected: boolean;
  isDimmed: boolean;
  /** Which proposed action is open in the detail panel, when the actions node is selected. */
  selectedActionIndex: number | null;
};

interface DecisionTreeActionsContextValue {
  onSelectAction: (index: number) => void;
  onToggleActionsExpanded: () => void;
}

/** Lets the actions node's own controls reach the canvas without going through node data. */
export const DecisionTreeActionsContext = createContext<DecisionTreeActionsContextValue>({
  onSelectAction: () => {},
  onToggleActionsExpanded: () => {},
});

export type DecisionTreeFlowNode = Node<DecisionTreeFlowNodeData, 'decisionTree'>;

/** Height of the coloured band that carries a node's role label. */
const OUTER_HEADER_HEIGHT = 40;
const OUTER_PADDING = 4;
const INNER_PADDING = 16;
const BODY_LINE_HEIGHT = 20;

const nodeReveal = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

interface RoleColors {
  background: string;
  border: string;
  strongBorder: string;
  label: string;
}

const useRoleColors = (kind: DecisionTreeNodeKind): RoleColors => {
  const { colors } = useEuiTheme().euiTheme;
  switch (kind) {
    case 'trigger':
      return {
        background: colors.backgroundBaseDanger,
        border: colors.borderBaseDanger,
        strongBorder: colors.borderStrongDanger,
        label: colors.textDanger,
      };
    case 'hypothesis':
      return {
        background: colors.backgroundBaseHighlighted,
        border: colors.borderBaseSubdued,
        strongBorder: colors.borderStrongText,
        label: colors.textSubdued,
      };
    case 'hypotheses':
      return {
        background: colors.backgroundBasePlain,
        border: colors.borderBaseSubdued,
        strongBorder: colors.borderStrongText,
        label: colors.textSubdued,
      };
    case 'conclusion':
      return {
        background: colors.backgroundBaseSuccess,
        border: colors.borderBaseSuccess,
        strongBorder: colors.borderStrongSuccess,
        label: colors.textSuccess,
      };
    case 'actions':
      return {
        background: colors.backgroundBasePrimary,
        border: colors.borderBasePrimary,
        strongBorder: colors.borderStrongPrimary,
        label: colors.textPrimary,
      };
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled decision tree node: ${exhaustive}`);
    }
  }
};

const clampLines = (lines: number) => css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  line-clamp: ${lines};
  overflow: hidden;
  word-break: break-word;
`;

const formatConfidence = (confidence: number): string =>
  i18n.translate('xpack.nightshiftInvestigations.visualiser.confidence', {
    defaultMessage: 'Confidence {confidence, number, percent}',
    values: { confidence },
  });

const NodeShell = ({
  kind,
  label,
  trailing,
  isSelected,
  isDimmed,
  revealIndex,
  footer,
  width = DECISION_TREE_NODE_WIDTH[kind],
  children,
}: {
  kind: DecisionTreeNodeKind;
  label: string;
  /** Must match the width the layout reserved for this node. */
  width?: number;
  trailing?: React.ReactNode;
  /** Rendered on the outer band below the header, for nodes without an inner card. */
  footer?: React.ReactNode;
  isSelected: boolean;
  isDimmed: boolean;
  /** Fades the node in on mount, staggered by its position in the row. */
  revealIndex?: number;
  children?: React.ReactNode;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const roleColors = useRoleColors(kind);

  return (
    <div
      data-test-subj={`nightshiftDecisionTreeNode-${kind}`}
      css={css`
        box-sizing: border-box;
        width: ${width}px;
        padding: 0 ${OUTER_PADDING}px ${children ? OUTER_PADDING : 0}px;
        background: ${roleColors.background};
        border: ${euiTheme.border.width.thin} solid
          ${isSelected ? roleColors.strongBorder : roleColors.border};
        border-radius: 12px;
        box-shadow: ${isSelected ? `0 0 0 2px ${roleColors.strongBorder}` : 'none'};
        cursor: pointer;
        opacity: ${isDimmed ? 0.45 : 1};
        transition: opacity ${euiTheme.animation.normal} ease,
          border-color ${euiTheme.animation.fast} ease;

        &:hover {
          border-color: ${roleColors.strongBorder};
        }

        ${revealIndex !== undefined &&
        css`
          animation: ${nodeReveal} ${euiTheme.animation.slow} ease-out both;
          animation-delay: ${revealIndex * 60}ms;
        `}

        @media (prefers-reduced-motion: reduce) {
          animation: none;
          transition: none;
        }
      `}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} css={hiddenHandleCss} />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
        css={css`
          height: ${OUTER_HEADER_HEIGHT}px;
          padding: 0 ${euiTheme.size.xs} 0 ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            css={css`
              color: ${roleColors.label};
              line-height: 18px;
            `}
          >
            {label}
          </EuiText>
        </EuiFlexItem>
        {trailing && <EuiFlexItem grow={false}>{trailing}</EuiFlexItem>}
      </EuiFlexGroup>
      {footer && (
        <div
          css={css`
            padding: 0 ${euiTheme.size.s} ${euiTheme.size.m};
          `}
        >
          {footer}
        </div>
      )}
      {children && (
        <div
          css={css`
            box-sizing: border-box;
            margin-top: ${euiTheme.size.xs};
            padding: ${INNER_PADDING}px;
            background: ${euiTheme.colors.backgroundBasePlain};
            border: ${euiTheme.border.thin};
            border-color: ${euiTheme.colors.borderBaseSubdued};
            border-radius: ${euiTheme.size.s};
          `}
        >
          {children}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        css={hiddenHandleCss}
      />
    </div>
  );
};

const hiddenHandleCss = css`
  opacity: 0;
  pointer-events: none;
`;

const BodyText = ({
  children,
  lines,
  bold = false,
  color,
}: {
  children: React.ReactNode;
  lines: number;
  bold?: boolean;
  color?: 'subdued';
}): React.ReactElement => (
  <EuiText
    size="s"
    color={color}
    css={css`
      line-height: ${BODY_LINE_HEIGHT}px;
      min-height: ${lines * BODY_LINE_HEIGHT}px;
      ${bold && 'font-weight: 700;'}
      ${clampLines(lines)}
    `}
  >
    {children}
  </EuiText>
);

/**
 * Clamped markdown. Plain `text` nodes inside code blocks do not get a token class, so the code
 * font is set on the block itself — the same treatment as the investigation flyout.
 */
const ClampedMarkdown = ({
  text,
  lines,
  color,
}: {
  text: string;
  lines: number;
  color?: 'subdued';
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      size="s"
      color={color}
      css={css`
        line-height: ${BODY_LINE_HEIGHT}px;
        min-height: ${lines * BODY_LINE_HEIGHT}px;
        ${clampLines(lines)}
        ${codeBlockTextCss(euiTheme.font.familyCode, euiTheme.colors.textParagraph)}
      `}
    >
      <EuiMarkdownFormat textSize="s">{text}</EuiMarkdownFormat>
    </EuiText>
  );
};

const codeBlockTextCss = (fontFamily: string, color: string) => css`
  .euiCodeBlock__code,
  .euiCodeBlock__line,
  .euiCodeBlock__lineText,
  pre code,
  code[data-code-language] {
    font-family: ${fontFamily};
    color: ${color};
  }
`;

const TRIGGER_ICON: Record<InvestigationSubjectType, IconType> = {
  alert: 'bell',
  significant_event: 'bolt',
  manual: 'user',
};

const TRIGGER_TYPE_LABEL: Record<InvestigationSubjectType, string> = {
  alert: i18n.translate('xpack.nightshiftInvestigations.visualiser.triggerAlert', {
    defaultMessage: 'Alert',
  }),
  significant_event: i18n.translate(
    'xpack.nightshiftInvestigations.visualiser.triggerSignificantEvent',
    { defaultMessage: 'Significant event' }
  ),
  manual: i18n.translate('xpack.nightshiftInvestigations.visualiser.triggerManual', {
    defaultMessage: 'Manual investigation',
  }),
};

export const getTriggerTypeLabel = (type: InvestigationSubjectType): string =>
  TRIGGER_TYPE_LABEL[type];

export const getHypothesesCountLabel = (count: number): string =>
  i18n.translate('xpack.nightshiftInvestigations.visualiser.hypothesesCount', {
    defaultMessage: '{count, plural, one {# hypothesis} other {# hypotheses}}',
    values: { count },
  });

export const getActionsCountLabel = (count: number): string =>
  i18n.translate('xpack.nightshiftInvestigations.visualiser.actionsCount', {
    defaultMessage: '{count, plural, one {# proposed action} other {# proposed actions}}',
    values: { count },
  });

const triggerLabel = i18n.translate('xpack.nightshiftInvestigations.visualiser.triggerLabel', {
  defaultMessage: 'Trigger',
});
const hypothesisLabel = i18n.translate(
  'xpack.nightshiftInvestigations.visualiser.hypothesisLabel',
  { defaultMessage: 'Hypothesis' }
);
const conclusionLabel = i18n.translate(
  'xpack.nightshiftInvestigations.visualiser.conclusionLabel',
  { defaultMessage: 'Conclusion' }
);

export const HypothesisStatusBadge = ({
  status,
}: {
  status: InvestigationHypothesis['status'];
}): React.ReactElement => {
  switch (status) {
    case 'confirmed':
      return (
        <EuiBadge color="success" iconType="checkCircle">
          {i18n.translate('xpack.nightshiftInvestigations.visualiser.statusConfirmed', {
            defaultMessage: 'Confirmed',
          })}
        </EuiBadge>
      );
    case 'dismissed':
      return (
        <EuiBadge color="default" iconType="cross">
          {i18n.translate('xpack.nightshiftInvestigations.visualiser.statusRejected', {
            defaultMessage: 'Rejected',
          })}
        </EuiBadge>
      );
    case 'investigating':
      return (
        <EuiBadge color="hollow">
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} component="span">
            <EuiLoadingSpinner size="s" />
            <span>
              {i18n.translate('xpack.nightshiftInvestigations.visualiser.statusChecking', {
                defaultMessage: 'Checking',
              })}
            </span>
          </EuiFlexGroup>
        </EuiBadge>
      );
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled hypothesis status: ${exhaustive}`);
    }
  }
};

/** How many cards peek out behind the front of a collapsed stack. */
const MAX_STACK_LAYERS = 2;
const STACK_LAYER_OFFSET = 4;

const ActionCard = ({
  recommendation: { title, confidence },
  index,
  isSelected,
}: {
  recommendation: InvestigationRecommendation;
  index: number;
  isSelected: boolean;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { onSelectAction } = useContext(DecisionTreeActionsContext);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj={`nightshiftDecisionTreeAction-${index}`}
      aria-label={title}
      onClick={(event: React.MouseEvent) => {
        // The node's own click would select the stack as a whole rather than this action.
        event.stopPropagation();
        onSelectAction(index);
      }}
      css={css`
        position: relative;
        width: 100%;
        text-align: left;
        border-color: ${isSelected
          ? euiTheme.colors.borderStrongPrimary
          : euiTheme.colors.borderBaseSubdued};
        box-shadow: ${isSelected ? `0 0 0 1px ${euiTheme.colors.borderStrongPrimary}` : 'none'};

        &:hover {
          border-color: ${euiTheme.colors.borderStrongPrimary};
        }
      `}
    >
      <BodyText lines={3} bold>
        {title}
      </BodyText>
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
      >
        {formatConfidence(confidence)}
      </EuiText>
    </EuiPanel>
  );
};

const ActionsStack = ({
  recommendations,
  isExpanded,
  selectedIndex,
}: {
  recommendations: InvestigationRecommendation[];
  isExpanded: boolean;
  selectedIndex: number | null;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { onToggleActionsExpanded } = useContext(DecisionTreeActionsContext);
  const canExpand = recommendations.length > 1;
  const [recommended] = recommendations;
  const layerCount = Math.min(recommendations.length - 1, MAX_STACK_LAYERS);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      {isExpanded ? (
        recommendations.map((recommendation, index) => (
          <EuiFlexItem key={`${recommendation.title}-${index}`} grow={false}>
            <ActionCard
              recommendation={recommendation}
              index={index}
              isSelected={selectedIndex === index}
            />
          </EuiFlexItem>
        ))
      ) : (
        <EuiFlexItem
          grow={false}
          data-test-subj="nightshiftDecisionTreeActionsStack"
          css={css`
            position: relative;
            padding: 0 ${layerCount * STACK_LAYER_OFFSET}px ${layerCount * STACK_LAYER_OFFSET}px 0;
          `}
        >
          {Array.from({ length: layerCount }, (_, layer) => {
            const offset = (layerCount - layer) * STACK_LAYER_OFFSET;
            return (
              <div
                key={layer}
                aria-hidden={true}
                css={css`
                  position: absolute;
                  inset: ${offset}px 0 0 ${offset}px;
                  background: ${euiTheme.colors.backgroundBasePlain};
                  border: ${euiTheme.border.thin};
                  border-color: ${euiTheme.colors.borderBaseSubdued};
                  border-radius: ${euiTheme.border.radius.medium};
                `}
              />
            );
          })}
          <ActionCard recommendation={recommended} index={0} isSelected={selectedIndex === 0} />
        </EuiFlexItem>
      )}
      {canExpand && (
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <EuiLink
              data-test-subj="nightshiftDecisionTreeActionsToggle"
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                onToggleActionsExpanded();
              }}
            >
              {isExpanded
                ? i18n.translate('xpack.nightshiftInvestigations.visualiser.collapseActions', {
                    defaultMessage: 'Collapse',
                  })
                : i18n.translate('xpack.nightshiftInvestigations.visualiser.expandActions', {
                    defaultMessage: 'Expand',
                  })}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const DecisionTreeNodeComponent = ({
  data,
}: NodeProps<DecisionTreeFlowNode>): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { isSelected, isDimmed } = data;
  const shellProps = { isSelected, isDimmed };

  switch (data.kind) {
    case 'trigger':
      return (
        <NodeShell kind="trigger" label={triggerLabel} {...shellProps}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={TRIGGER_ICON[data.trigger.type]} size="m" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <BodyText lines={2} bold>
                {data.trigger.name}
              </BodyText>
              <EuiText size="xs" color="subdued">
                {getTriggerTypeLabel(data.trigger.type)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </NodeShell>
      );

    case 'hypotheses':
      return (
        <NodeShell
          kind="hypotheses"
          label={getHypothesesCountLabel(data.total)}
          {...shellProps}
          trailing={
            <EuiIcon
              type={data.isExpanded ? 'minimize' : 'maximize'}
              color="subdued"
              aria-hidden={true}
              css={css`
                margin-right: ${euiTheme.size.xs};
              `}
            />
          }
          footer={
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
              {data.counts.confirmed > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success" iconType="check">
                    {i18n.translate('xpack.nightshiftInvestigations.visualiser.confirmedCount', {
                      defaultMessage: '{count} Confirmed',
                      values: { count: data.counts.confirmed },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {data.counts.dismissed > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="default" iconType="cross">
                    {i18n.translate('xpack.nightshiftInvestigations.visualiser.rejectedCount', {
                      defaultMessage: '{count} Rejected',
                      values: { count: data.counts.dismissed },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {data.counts.investigating > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.nightshiftInvestigations.visualiser.checkingCount', {
                      defaultMessage: '{count} Checking',
                      values: { count: data.counts.investigating },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        />
      );

    case 'hypothesis':
      return (
        <NodeShell
          kind="hypothesis"
          label={hypothesisLabel}
          {...shellProps}
          revealIndex={data.index}
        >
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <HypothesisStatusBadge status={data.hypothesis.status} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {formatConfidence(data.hypothesis.confidence)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <BodyText lines={2} bold>
              {data.hypothesis.candidate}
            </BodyText>
            <ClampedMarkdown text={data.hypothesis.reason ?? ''} lines={3} color="subdued" />
          </EuiFlexGroup>
        </NodeShell>
      );

    case 'conclusion':
      return (
        <NodeShell
          kind="conclusion"
          label={conclusionLabel}
          width={getDecisionTreeNodeWidth(data)}
          {...shellProps}
        >
          <ClampedMarkdown text={data.conclusion} lines={4} />
        </NodeShell>
      );

    case 'actions':
      return (
        <NodeShell
          kind="actions"
          label={getActionsCountLabel(data.recommendations.length)}
          {...shellProps}
          footer={
            <ActionsStack
              recommendations={data.recommendations}
              isExpanded={data.isExpanded}
              selectedIndex={data.selectedActionIndex}
            />
          }
        />
      );

    default: {
      const exhaustive: never = data;
      throw new Error(`Unhandled decision tree node: ${JSON.stringify(exhaustive)}`);
    }
  }
};

export const DecisionTreeNode = memo(DecisionTreeNodeComponent);

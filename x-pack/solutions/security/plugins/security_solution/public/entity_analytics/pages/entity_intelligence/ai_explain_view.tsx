/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiIcon,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { LoadingShimmer } from './components';
import { getAlertSeverityColor } from './common';
import type {
  AiExplainResult,
  ExplainAction,
  ExplainChainStep,
  ExplainConfidence,
  ExplainEntity,
  ExplainEntityRef,
} from './ai_explain';
import type { AlertSeverity } from './hooks/use_entity_relationships';

const CONFIDENCE_COLOR = (euiTheme: EuiThemeComputed, confidence: ExplainConfidence): string => {
  const { danger, warning, neutral } = euiTheme.colors.severity;
  switch (confidence) {
    case 'high':
      return neutral;
    case 'medium':
      return warning;
    default:
      return danger;
  }
};

const CONFIDENCE_LABEL = (confidence: ExplainConfidence): string => {
  switch (confidence) {
    case 'high':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainConfidenceHigh',
        { defaultMessage: 'High confidence' }
      );
    case 'medium':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainConfidenceMedium',
        { defaultMessage: 'Medium confidence' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainConfidenceLow',
        { defaultMessage: 'Low confidence' }
      );
  }
};

const entityIcon = (kind: string | undefined): string => {
  switch (kind) {
    case 'host':
      return 'compute';
    case 'service':
      return 'gear';
    case 'ip':
      return 'globe';
    default:
      return 'user';
  }
};

const actionIcon = (action: ExplainAction['action']): string => {
  switch (action) {
    case 'hunt':
      return 'comment';
    case 'alerts':
      return 'bell';
    case 'focus':
      return 'crosshair';
    default:
      return 'check';
  }
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        font-size: 12px;
        font-weight: ${euiTheme.font.weight.bold};
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      {children}
    </div>
  );
};

/**
 * A horizontal, wrapping attack-flow diagram: severity-tinted step cards joined
 * by directional connectors. Each card shows an ordinal, the step, and its
 * grounding evidence. Clicking a card (when it has evidence) calls `onStepClick`
 * so the host can highlight the related node/edge or open its evidence.
 */
const SEVERITY_LEGEND_ORDER: readonly AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

const severityLabel = (severity: AlertSeverity): string => {
  switch (severity) {
    case 'critical':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainSeverityCritical',
        { defaultMessage: 'Critical' }
      );
    case 'high':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainSeverityHigh',
        { defaultMessage: 'High' }
      );
    case 'medium':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainSeverityMedium',
        { defaultMessage: 'Medium' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainSeverityLow',
        { defaultMessage: 'Low' }
      );
  }
};

/**
 * Compact severity legend so the node colors on the attack flow are
 * self-explanatory. Only shows the severities actually present in the chain.
 */
const AttackFlowLegend: React.FC<{ severities: readonly AlertSeverity[] }> = ({ severities }) => {
  const { euiTheme } = useEuiTheme();
  if (severities.length === 0) return null;
  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: ${euiTheme.size.m};
      `}
      data-test-subj="aiExplainChainLegend"
    >
      {SEVERITY_LEGEND_ORDER.filter((severity) => severities.includes(severity)).map((severity) => (
        <span
          key={severity}
          css={css`
            display: inline-flex;
            align-items: center;
            gap: ${euiTheme.size.xs};
            font-size: 11px;
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          <span
            css={css`
              width: ${euiTheme.size.s};
              height: ${euiTheme.size.s};
              border-radius: 50%;
              background: ${getAlertSeverityColor(euiTheme, severity)};
            `}
          />
          {severityLabel(severity)}
        </span>
      ))}
    </div>
  );
};

/**
 * Vertical attack-flow stepper. Steps run top→bottom with a continuous
 * connective rail (numbered severity-tinted node → downward line → next node),
 * so the progression reads unambiguously at any panel width — no wrap-around
 * arrows that jump backwards. Each step shows an ordinal, severity badge,
 * readable label, and its grounding evidence. Clicking a step (when it has a
 * handler) calls `onStepClick` so the host can highlight the related node/edge
 * or open its evidence.
 */
const AttackFlowDiagram: React.FC<{
  steps: readonly ExplainChainStep[];
  onStepClick?: (step: ExplainChainStep) => void;
}> = ({ steps, onStepClick }) => {
  const { euiTheme } = useEuiTheme();
  const stepColor = (severity: AlertSeverity | undefined) =>
    severity ? getAlertSeverityColor(euiTheme, severity) : euiTheme.colors.borderBasePlain;
  const nodeSize = euiTheme.size.xl;
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
      `}
      data-test-subj="aiExplainChain"
    >
      {steps.map((step, index) => {
        const color = stepColor(step.severity);
        const interactive = !!onStepClick;
        const isLast = index === steps.length - 1;
        return (
          <div
            key={`${step.label}-${index}`}
            css={css`
              display: grid;
              grid-template-columns: ${nodeSize} minmax(0, 1fr);
              column-gap: ${euiTheme.size.m};
            `}
          >
            {/* Rail column: numbered node + downward connector to the next step. */}
            <div
              css={css`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              <span
                css={css`
                  display: inline-flex;
                  width: ${nodeSize};
                  height: ${nodeSize};
                  flex-shrink: 0;
                  align-items: center;
                  justify-content: center;
                  border-radius: 50%;
                  background: ${transparentize(color, 0.2)};
                  border: ${euiTheme.border.width.thick} solid ${color};
                  font-size: 12px;
                  font-weight: ${euiTheme.font.weight.bold};
                  font-variant-numeric: tabular-nums;
                  color: ${euiTheme.colors.textHeading};
                `}
              >
                {index + 1}
              </span>
              {!isLast ? (
                <span
                  css={css`
                    flex: 1;
                    width: ${euiTheme.border.width.thick};
                    min-height: ${euiTheme.size.m};
                    margin: ${euiTheme.size.xs} 0;
                    background: ${transparentize(euiTheme.colors.borderBasePlain, 0.4)};
                  `}
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {/* Step card. */}
            <div
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              onClick={interactive ? () => onStepClick(step) : undefined}
              onKeyDown={
                interactive
                  ? (keyEvent) => {
                      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                        keyEvent.preventDefault();
                        onStepClick(step);
                      }
                    }
                  : undefined
              }
              data-test-subj="aiExplainChainStep"
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${euiTheme.size.xs};
                margin-bottom: ${isLast ? '0' : euiTheme.size.s};
                padding: ${euiTheme.size.s} ${euiTheme.size.m};
                border: ${euiTheme.border.thin};
                border-left: ${euiTheme.border.width.thick} solid ${color};
                border-radius: ${euiTheme.border.radius.medium};
                background: ${transparentize(color, 0.06)};
                cursor: ${interactive ? 'pointer' : 'default'};
                transition: transform ${euiTheme.animation.fast} ease,
                  background-color ${euiTheme.animation.fast} ease;

                &:hover {
                  background: ${interactive
                    ? transparentize(color, 0.12)
                    : transparentize(color, 0.06)};
                  transform: ${interactive ? 'translateX(2px)' : 'none'};
                }

                @media (prefers-reduced-motion: reduce) {
                  transition: none;
                  &:hover {
                    transform: none;
                  }
                }
              `}
            >
              <div
                css={css`
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: ${euiTheme.size.xs};
                `}
              >
                <EuiText
                  size="s"
                  css={css`
                    font-weight: ${euiTheme.font.weight.medium};
                    color: ${euiTheme.colors.textParagraph};
                    line-height: 1.4;
                  `}
                >
                  {step.label}
                </EuiText>
                {step.severity ? (
                  <EuiBadge color={getAlertSeverityColor(euiTheme, step.severity)}>
                    {step.severity}
                  </EuiBadge>
                ) : null}
              </div>
              {step.evidence ? (
                <EuiText size="xs" color="subdued">
                  <span
                    css={css`
                      display: inline-flex;
                      align-items: center;
                      gap: 2px;
                      overflow-wrap: anywhere;
                    `}
                  >
                    <EuiIcon type="link" size="s" aria-hidden={true} />
                    {step.evidence}
                  </span>
                </EuiText>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** MITRE tactic strip: an ordered kill-chain-ish row of tactic chips. */
const TacticStrip: React.FC<{ tactics: readonly string[] }> = ({ tactics }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: ${euiTheme.size.xs};
      `}
      data-test-subj="aiExplainTactics"
    >
      {tactics.map((tactic, index) => (
        <React.Fragment key={tactic}>
          <EuiBadge color="hollow" iconType="bug">
            {tactic}
          </EuiBadge>
          {index < tactics.length - 1 ? (
            <EuiIcon type="sortRight" size="s" color="subdued" aria-hidden="true" />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Key-entities cluster mini-graph: the focus/subject entities as chips radiating
 * around a small hub, each clickable to focus the matching node in the graph.
 */
const EntityCluster: React.FC<{
  entities: readonly ExplainEntity[];
  onEntityClick?: (ref: ExplainEntityRef) => void;
  onEntityHover?: (ref: ExplainEntityRef | undefined) => void;
}> = ({ entities, onEntityClick, onEntityHover }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        gap: ${euiTheme.size.s};
      `}
      data-test-subj="aiExplainEntities"
    >
      {entities.map((entity) => {
        const ref: ExplainEntityRef = { name: entity.name, kind: entity.kind };
        const interactive = !!onEntityClick;
        const focusLabel = i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainFocusEntity',
          { defaultMessage: 'Focus {name} in the graph', values: { name: entity.name } }
        );
        return (
          <EuiToolTip
            key={`${entity.kind}:${entity.name}`}
            content={interactive ? focusLabel : entity.name}
          >
            <span
              tabIndex={interactive ? -1 : 0}
              onMouseEnter={onEntityHover ? () => onEntityHover(ref) : undefined}
              onMouseLeave={onEntityHover ? () => onEntityHover(undefined) : undefined}
              data-test-subj="aiExplainEntityChip"
            >
              {interactive ? (
                <EuiBadge
                  iconType={entityIcon(entity.kind)}
                  color="hollow"
                  onClick={() => onEntityClick(ref)}
                  onClickAriaLabel={focusLabel}
                >
                  {entity.name}
                </EuiBadge>
              ) : (
                <EuiBadge iconType={entityIcon(entity.kind)} color="hollow">
                  {entity.name}
                </EuiBadge>
              )}
            </span>
          </EuiToolTip>
        );
      })}
    </div>
  );
};

export interface AiExplainViewProps {
  result: AiExplainResult | undefined;
  rawResult: string | undefined;
  isGenerating: boolean;
  error: string | undefined;
  hasConnector: boolean;
  connectorName: string;
  /** Triggers (or retries) generation. */
  onGenerate: () => void;
  /** Whether a generation has ever been requested (drives the initial CTA). */
  hasRequested: boolean;
  /** Click a key entity → focus/select that node in the graph. */
  onEntityClick?: (ref: ExplainEntityRef) => void;
  /** Hover a key entity → pulse the matching graph node. */
  onEntityHover?: (ref: ExplainEntityRef | undefined) => void;
  /** Click a progression step → highlight related node/edge or open evidence. */
  onStepClick?: (step: ExplainChainStep) => void;
  /** Invoke a real "next step" action (hunt / alerts pivot / focus). */
  onAction?: (action: ExplainAction) => void;
}

/**
 * Shared renderer for the AI "explain this" output on the graph and timeline.
 * Renders the model's structured reply as its OWN graphics — a plain-language
 * summary, an explicit assessment callout, a horizontal attack-flow diagram
 * (with per-step evidence), a severity sparkline, a MITRE tactic strip, a
 * clickable key-entity cluster, a severity rationale, and actionable next-step
 * controls (hunt / alerts pivot / focus). Interactivity callbacks let the host
 * cross-highlight/focus graph nodes and launch real actions. Graceful loading,
 * empty, error, and "no AI connector" states; falls back to clamped markdown
 * when the model ignores the contract, with the full raw response behind an
 * accordion. Grounding is enforced upstream by the prompt.
 */
export const AiExplainView: React.FC<AiExplainViewProps> = ({
  result,
  rawResult,
  isGenerating,
  error,
  hasConnector,
  connectorName,
  onGenerate,
  hasRequested,
  onEntityClick,
  onEntityHover,
  onStepClick,
  onAction,
}) => {
  const { euiTheme } = useEuiTheme();
  const rawAccordionId = useGeneratedHtmlId({ prefix: 'aiExplainRaw' });

  const sectionStyle = css`
    margin-top: ${euiTheme.size.l};
    padding-top: ${euiTheme.size.m};
    border-top: ${euiTheme.border.thin};
  `;

  const runAction = useCallback(
    (action: ExplainAction) => {
      if (action.action !== 'none') onAction?.(action);
    },
    [onAction]
  );

  if (!hasConnector) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        iconType="warning"
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainNoConnector',
          { defaultMessage: 'No AI connector is configured for this space.' }
        )}
        data-test-subj="aiExplainNoConnector"
      >
        <EuiText size="xs">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainNoConnectorHint',
              { defaultMessage: 'Configure a Generative AI connector to use AI explanations.' }
            )}
          </p>
        </EuiText>
      </EuiCallOut>
    );
  }

  if (isGenerating) {
    return (
      <LoadingShimmer
        lines={5}
        label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainGenerating',
          { defaultMessage: 'Analyzing and explaining…' }
        )}
      />
    );
  }

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="danger"
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainError',
          { defaultMessage: 'The explanation could not be generated.' }
        )}
        data-test-subj="aiExplainError"
      >
        <EuiButton size="s" onClick={onGenerate}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainRetry',
            { defaultMessage: 'Retry' }
          )}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (!hasRequested || (rawResult === undefined && result === undefined)) {
    return (
      <div data-test-subj="aiExplainCta">
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainCta',
              { defaultMessage: 'Let AI summarize what you are looking at and suggest next steps.' }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiButton
          size="s"
          iconType="sparkles"
          fill
          onClick={onGenerate}
          data-test-subj="aiExplainGenerate"
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainGenerate',
            { defaultMessage: 'Explain this' }
          )}
        </EuiButton>
      </div>
    );
  }

  return (
    <div data-test-subj="aiExplainView">
      {result ? (
        <>
          {/* Summary */}
          <div
            css={css`
              display: flex;
              gap: ${euiTheme.size.m};
              align-items: flex-start;
              padding: ${euiTheme.size.m};
              border-left: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
              border-radius: 0 ${euiTheme.border.radius.small} ${euiTheme.border.radius.small} 0;
              background: ${transparentize(euiTheme.colors.primary, 0.05)};
            `}
          >
            <EuiIcon type="sparkles" color="primary" size="l" aria-hidden={true} />
            <EuiText size="m">
              <span
                css={css`
                  color: ${euiTheme.colors.textHeading};
                  font-weight: ${euiTheme.font.weight.medium};
                  line-height: 1.6;
                `}
              >
                {result.summary}
              </span>
            </EuiText>
          </div>

          {/* Assessment */}
          {result.assessment ? (
            <div css={sectionStyle} data-test-subj="aiExplainAssessment">
              <SectionHeading>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainAssessmentLabel',
                  { defaultMessage: 'Assessment' }
                )}
              </SectionHeading>
              <EuiSpacer size="s" />
              <div
                css={css`
                  display: flex;
                  gap: ${euiTheme.size.s};
                  align-items: flex-start;
                  color: ${euiTheme.colors.textParagraph};
                  line-height: 1.5;
                `}
              >
                <EuiIcon type="inspect" size="m" color="subdued" aria-hidden={true} />
                <EuiText size="s">
                  <span>{result.assessment}</span>
                </EuiText>
              </div>
            </div>
          ) : null}

          {/* Attack flow */}
          {result.chain.length > 0 ? (
            <div css={sectionStyle}>
              <SectionHeading>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainChainLabel',
                  { defaultMessage: 'Attack flow' }
                )}
              </SectionHeading>
              <EuiSpacer size="s" />
              <AttackFlowLegend
                severities={SEVERITY_LEGEND_ORDER.filter((severity) =>
                  result.chain.some((step) => step.severity === severity)
                )}
              />
              <EuiSpacer size="s" />
              <AttackFlowDiagram steps={result.chain} onStepClick={onStepClick} />
            </div>
          ) : null}

          {/* Tactic strip */}
          {result.tactics.length > 0 ? (
            <div css={sectionStyle}>
              <SectionHeading>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainTacticsLabel',
                  { defaultMessage: 'MITRE ATT&CK' }
                )}
              </SectionHeading>
              <EuiSpacer size="s" />
              <TacticStrip tactics={result.tactics} />
            </div>
          ) : null}

          {/* Key-entities cluster */}
          {result.entities.length > 0 ? (
            <div css={sectionStyle}>
              <SectionHeading>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainEntitiesLabel',
                  { defaultMessage: 'Key entities' }
                )}
              </SectionHeading>
              <EuiSpacer size="s" />
              <EntityCluster
                entities={result.entities}
                onEntityClick={onEntityClick}
                onEntityHover={onEntityHover}
              />
            </div>
          ) : null}

          {/* Actionable next steps */}
          {result.actions.length > 0 ? (
            <div css={sectionStyle}>
              <SectionHeading>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainNextLabel',
                  { defaultMessage: 'What to investigate next' }
                )}
              </SectionHeading>
              <EuiSpacer size="s" />
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: ${euiTheme.size.s};
                `}
                data-test-subj="aiExplainNextSteps"
              >
                {result.actions.map((action, index) => {
                  const isActionable = action.action !== 'none' && !!onAction;
                  return (
                    <div
                      key={index}
                      role={isActionable ? 'button' : undefined}
                      tabIndex={isActionable ? 0 : undefined}
                      onClick={isActionable ? () => runAction(action) : undefined}
                      onKeyDown={
                        isActionable
                          ? (keyEvent) => {
                              if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                                keyEvent.preventDefault();
                                runAction(action);
                              }
                            }
                          : undefined
                      }
                      data-test-subj={
                        isActionable ? 'aiExplainActionButton' : 'aiExplainActionStatic'
                      }
                      css={css`
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: ${euiTheme.size.s};
                        padding: ${euiTheme.size.s} ${euiTheme.size.m};
                        border: ${euiTheme.border.width.thin} solid
                          ${transparentize(euiTheme.colors.primary, isActionable ? 0.4 : 0.2)};
                        border-radius: ${euiTheme.border.radius.medium};
                        background: ${transparentize(euiTheme.colors.primary, 0.05)};
                        font-size: ${euiTheme.size.m};
                        line-height: 1.5;
                        color: ${euiTheme.colors.textParagraph};
                        cursor: ${isActionable ? 'pointer' : 'default'};
                        transition: background-color ${euiTheme.animation.fast} ease;

                        &:hover {
                          background: ${transparentize(
                            euiTheme.colors.primary,
                            isActionable ? 0.1 : 0.05
                          )};
                        }
                      `}
                    >
                      <span
                        css={css`
                          display: flex;
                          align-items: flex-start;
                          gap: ${euiTheme.size.s};
                        `}
                      >
                        <EuiIcon
                          type={actionIcon(action.action)}
                          size="m"
                          color={isActionable ? 'primary' : 'subdued'}
                          css={css`
                            flex-shrink: 0;
                            margin-top: 2px;
                          `}
                          aria-hidden={true}
                        />
                        <span>{action.label}</span>
                      </span>
                      {isActionable ? (
                        <EuiIcon type="sortRight" size="s" color="primary" aria-hidden={true} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Footer: confidence + severity rationale + provenance */}
          <EuiSpacer size="l" />
          {result.severityRationale ? (
            <EuiText size="xs" color="subdued">
              <p>
                <strong>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainRationaleLabel',
                    { defaultMessage: 'Severity rationale: ' }
                  )}
                </strong>
                {result.severityRationale}
              </p>
            </EuiText>
          ) : null}
          <div
            css={css`
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: ${euiTheme.size.s};
              padding-top: ${euiTheme.size.m};
              border-top: ${euiTheme.border.thin};
            `}
          >
            {result.confidence ? (
              <span
                css={css`
                  display: inline-flex;
                  align-items: center;
                  gap: ${euiTheme.size.xs};
                  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
                  border-radius: ${euiTheme.border.radius.small};
                  background: ${transparentize(
                    CONFIDENCE_COLOR(euiTheme, result.confidence),
                    0.14
                  )};
                  border: ${euiTheme.border.width.thin} solid
                    ${transparentize(CONFIDENCE_COLOR(euiTheme, result.confidence), 0.4)};
                  font-size: 12px;
                  font-weight: ${euiTheme.font.weight.semiBold};
                  color: ${euiTheme.colors.textParagraph};
                `}
                data-test-subj="aiExplainConfidence"
              >
                <span
                  css={css`
                    width: ${euiTheme.size.s};
                    height: ${euiTheme.size.s};
                    border-radius: 50%;
                    background: ${CONFIDENCE_COLOR(euiTheme, result.confidence)};
                  `}
                />
                {CONFIDENCE_LABEL(result.confidence)}
              </span>
            ) : (
              <span />
            )}
            {connectorName ? (
              <EuiText size="xs" color="subdued">
                <span>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainProvenance',
                    {
                      defaultMessage: 'Generated by {connector}',
                      values: { connector: connectorName },
                    }
                  )}
                </span>
              </EuiText>
            ) : null}
          </div>
        </>
      ) : rawResult ? (
        <EuiMarkdownFormat textSize="s">{rawResult}</EuiMarkdownFormat>
      ) : null}

      {rawResult && result ? (
        <EuiAccordion
          id={rawAccordionId}
          css={css`
            margin-top: ${euiTheme.size.m};
          `}
          buttonProps={{ paddingSize: 's' }}
          buttonContent={
            <SectionHeading>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainFullResponse',
                { defaultMessage: 'Show full response' }
              )}
            </SectionHeading>
          }
          paddingSize="s"
          data-test-subj="aiExplainRawAccordion"
        >
          <EuiMarkdownFormat textSize="xs">{rawResult}</EuiMarkdownFormat>
        </EuiAccordion>
      ) : null}

      <EuiSpacer size="m" />
      <EuiButtonEmpty
        size="s"
        iconType="refresh"
        onClick={onGenerate}
        data-test-subj="aiExplainRegenerate"
      >
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainRegenerate',
          { defaultMessage: 'Regenerate' }
        )}
      </EuiButtonEmpty>
    </div>
  );
};

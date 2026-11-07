/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiIcon,
  EuiMarkdownFormat,
  EuiSpacer,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ExecutiveBrief, InsightSeverity, StructuredInsight } from './structured_insight';
import { parseExecutiveBrief, parseStructuredInsight } from './structured_insight';

const SEVERITY_LABELS: Record<InsightSeverity, string> = {
  critical: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.insight.severity.critical',
    { defaultMessage: 'Critical' }
  ),
  high: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.insight.severity.high',
    { defaultMessage: 'High' }
  ),
  medium: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.insight.severity.medium',
    { defaultMessage: 'Medium' }
  ),
  low: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.insight.severity.low', {
    defaultMessage: 'Low',
  }),
  informational: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.insight.severity.informational',
    { defaultMessage: 'Informational' }
  ),
};

const getSeverityColor = (
  euiTheme: EuiThemeComputed,
  severity: InsightSeverity | undefined
): string => {
  const { danger, risk, warning, neutral, unknown } = euiTheme.colors.severity;
  switch (severity) {
    case 'critical':
      return danger;
    case 'high':
      return risk;
    case 'medium':
      return warning;
    case 'low':
      return neutral;
    default:
      return unknown;
  }
};

const FINDINGS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.insight.findingsLabel',
  { defaultMessage: 'Key findings' }
);

const ACTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.insight.actionsLabel',
  { defaultMessage: 'Recommended actions' }
);

const FULL_RESPONSE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.insight.fullResponseLabel',
  { defaultMessage: 'Show full response' }
);

const SHOW_MORE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.insight.showMore',
  { defaultMessage: 'Show more' }
);

const SHOW_LESS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.insight.showLess',
  { defaultMessage: 'Show less' }
);

const EXECUTIVE_NARRATIVE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.executiveBrief.narrativeLabel',
  { defaultMessage: 'Threat narrative' }
);

const EXECUTIVE_DRIVERS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.executiveBrief.driversLabel',
  { defaultMessage: 'What is driving this' }
);

const EXECUTIVE_IMPACT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.executiveBrief.businessImpactLabel',
  { defaultMessage: 'Business impact' }
);

const EXECUTIVE_DECISIONS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.executiveBrief.decisionsLabel',
  { defaultMessage: 'Decisions and next steps' }
);

const SeverityChip: React.FC<{ severity: InsightSeverity }> = ({ severity }) => {
  const { euiTheme } = useEuiTheme();
  const color = getSeverityColor(euiTheme, severity);
  const style = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    padding: 2px ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(color, 0.14)};
    border: ${euiTheme.border.width.thin} solid ${transparentize(color, 0.4)};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textParagraph};
    white-space: nowrap;
  `;
  const dotStyle = css`
    width: ${euiTheme.size.s};
    height: ${euiTheme.size.s};
    border-radius: 50%;
    background: ${color};
  `;
  return (
    <span css={style} data-test-subj="entityIntelligenceInsightSeverity">
      <span css={dotStyle} />
      {SEVERITY_LABELS[severity]}
    </span>
  );
};

const QuietLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const style = css`
    font-size: 10px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${euiTheme.colors.textSubdued};
  `;
  return <div css={style}>{children}</div>;
};

const StructuredInsightBody: React.FC<{ insight: StructuredInsight }> = ({ insight }) => {
  const { euiTheme } = useEuiTheme();
  const severityColor = getSeverityColor(euiTheme, insight.severity);

  const verdictStyle = css`
    display: flex;
    align-items: flex-start;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-left: ${euiTheme.size.xs} solid ${severityColor};
    border-radius: 0 ${euiTheme.border.radius.small} ${euiTheme.border.radius.small} 0;
    background: ${transparentize(severityColor, 0.06)};
  `;

  const verdictTextStyle = css`
    font-size: ${euiTheme.size.m};
    line-height: 1.45;
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textHeading};
  `;

  const findingRowStyle = css`
    display: flex;
    align-items: flex-start;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.xs} 0;
    font-size: ${euiTheme.size.m};
    line-height: 1.4;
    color: ${euiTheme.colors.textParagraph};
  `;

  const findingIconStyle = css`
    flex-shrink: 0;
    margin-top: 2px;
  `;

  const actionRowStyle = css`
    display: flex;
    align-items: flex-start;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border: ${euiTheme.border.width.thin} solid ${transparentize(euiTheme.colors.primary, 0.25)};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.primary, 0.05)};
    font-size: ${euiTheme.size.m};
    line-height: 1.4;
    color: ${euiTheme.colors.textParagraph};

    & + & {
      margin-top: ${euiTheme.size.xs};
    }
  `;

  const severityRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    font-size: ${euiTheme.size.m};
    line-height: 1.4;
    color: ${euiTheme.colors.textSubdued};
  `;

  return (
    <div data-test-subj="entityIntelligenceStructuredInsight">
      <div css={verdictStyle}>
        <span css={verdictTextStyle}>{insight.verdict}</span>
      </div>

      <EuiSpacer size="s" />
      <QuietLabel>{FINDINGS_LABEL}</QuietLabel>
      <EuiSpacer size="xs" />
      {insight.findings.map((finding, index) => (
        <div key={index} css={findingRowStyle}>
          <span css={findingIconStyle}>
            <EuiIcon type="dot" size="s" color={severityColor} aria-hidden={true} />
          </span>
          <span>{finding}</span>
        </div>
      ))}

      {insight.severity || insight.severityNote ? (
        <>
          <EuiSpacer size="s" />
          <div css={severityRowStyle}>
            {insight.severity ? <SeverityChip severity={insight.severity} /> : null}
            {insight.severityNote ? <span>{insight.severityNote}</span> : null}
          </div>
        </>
      ) : null}

      {insight.actions.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <QuietLabel>{ACTIONS_LABEL}</QuietLabel>
          <EuiSpacer size="xs" />
          {insight.actions.map((action, index) => (
            <div key={index} css={actionRowStyle}>
              <span css={findingIconStyle}>
                <EuiIcon type="chevronSingleRight" size="s" color="primary" aria-hidden={true} />
              </span>
              <span>{action}</span>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
};

const ExecutiveBriefBody: React.FC<{ brief: ExecutiveBrief }> = ({ brief }) => {
  const { euiTheme } = useEuiTheme();
  const narrativeStyle = css`
    padding: ${euiTheme.size.m};
    border-left: ${euiTheme.size.xs} solid ${euiTheme.colors.primary};
    border-radius: 0 ${euiTheme.border.radius.small} ${euiTheme.border.radius.small} 0;
    background: ${transparentize(euiTheme.colors.primary, 0.055)};
    color: ${euiTheme.colors.textHeading};
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.medium};
    line-height: 1.5;
  `;
  const sectionStyle = css`
    padding: ${euiTheme.size.m} 0;

    & + & {
      border-top: ${euiTheme.border.thin};
    }
  `;
  const itemStyle = css`
    display: flex;
    align-items: flex-start;
    gap: ${euiTheme.size.s};
    margin-top: ${euiTheme.size.s};
    color: ${euiTheme.colors.textParagraph};
    font-size: ${euiTheme.size.m};
    line-height: 1.45;
  `;
  const decisionStyle = css`
    ${itemStyle};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.primary, 0.045)};
  `;

  return (
    <div data-test-subj="entityIntelligenceExecutiveBrief">
      <QuietLabel>{EXECUTIVE_NARRATIVE_LABEL}</QuietLabel>
      <EuiSpacer size="xs" />
      <div css={narrativeStyle}>{brief.narrative}</div>

      {brief.drivers.length > 0 ? (
        <div css={sectionStyle} data-test-subj="entityIntelligenceExecutiveBriefDrivers">
          <QuietLabel>{EXECUTIVE_DRIVERS_LABEL}</QuietLabel>
          {brief.drivers.map((driver, index) => (
            <div key={index} css={itemStyle}>
              <EuiIcon type="dot" size="s" color="subdued" aria-hidden={true} />
              <span>{driver}</span>
            </div>
          ))}
        </div>
      ) : null}

      {brief.businessImpact ? (
        <div css={sectionStyle} data-test-subj="entityIntelligenceExecutiveBriefImpact">
          <QuietLabel>{EXECUTIVE_IMPACT_LABEL}</QuietLabel>
          <div css={itemStyle}>
            <EuiIcon type="briefcase" size="s" color="subdued" aria-hidden={true} />
            <span>{brief.businessImpact}</span>
          </div>
        </div>
      ) : null}

      <div css={sectionStyle}>
        <QuietLabel>{EXECUTIVE_DECISIONS_LABEL}</QuietLabel>
        {brief.decisions.map((decision, index) => (
          <div key={index} css={decisionStyle}>
            <EuiIcon type="chevronSingleRight" size="s" color="primary" aria-hidden={true} />
            <span>{decision}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Clamped markdown fallback for responses that ignore the labeled format. */
const ClampedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const clampStyle = css`
    position: relative;
    max-height: ${isExpanded ? 'none' : '220px'};
    overflow: hidden;

    ${!isExpanded
      ? `&::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: ${euiTheme.size.xxl};
          background: linear-gradient(transparent, ${euiTheme.colors.emptyShade});
          pointer-events: none;
        }`
      : ''}
  `;

  return (
    <div data-test-subj="entityIntelligenceInsightFallback">
      <div css={clampStyle}>
        <EuiMarkdownFormat textSize="xs">{content}</EuiMarkdownFormat>
      </div>
      <EuiButtonEmpty
        size="xs"
        iconType={isExpanded ? 'chevronSingleUp' : 'chevronSingleDown'}
        onClick={() => setIsExpanded((previous) => !previous)}
        data-test-subj="entityIntelligenceInsightExpand"
      >
        {isExpanded ? SHOW_LESS_LABEL : SHOW_MORE_LABEL}
      </EuiButtonEmpty>
    </div>
  );
};

/**
 * Shared renderer for structured AI insights (dossier insight + Overview
 * "Run Full Analysis"). Parses the labeled-line contract into a compact
 * verdict / findings / severity / actions layout; degrades to clamped
 * markdown when the model ignored the format. Raw output is always available
 * behind an accordion.
 */
export const StructuredInsightView: React.FC<{
  content: string;
  variant?: 'insight' | 'executive';
}> = ({ content, variant = 'insight' }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'entityIntelligenceInsightRaw' });
  const insight = useMemo(
    () => (variant === 'insight' ? parseStructuredInsight(content) : undefined),
    [content, variant]
  );
  const executiveBrief = useMemo(
    () => (variant === 'executive' ? parseExecutiveBrief(content) : undefined),
    [content, variant]
  );
  const hasStructuredContent = insight !== undefined || executiveBrief !== undefined;

  const rawAccordionStyle = css`
    margin-top: ${euiTheme.size.s};
  `;

  return (
    <div>
      {insight ? (
        <StructuredInsightBody insight={insight} />
      ) : executiveBrief ? (
        <ExecutiveBriefBody brief={executiveBrief} />
      ) : (
        <ClampedMarkdown content={content} />
      )}
      {hasStructuredContent ? (
        <EuiAccordion
          id={accordionId}
          css={rawAccordionStyle}
          buttonProps={{ paddingSize: 's' }}
          buttonContent={
            <QuietLabel>
              <span>{FULL_RESPONSE_LABEL}</span>
            </QuietLabel>
          }
          paddingSize="s"
          data-test-subj="entityIntelligenceInsightRawAccordion"
        >
          <EuiMarkdownFormat textSize="xs">{content}</EuiMarkdownFormat>
        </EuiAccordion>
      ) : null}
    </div>
  );
};

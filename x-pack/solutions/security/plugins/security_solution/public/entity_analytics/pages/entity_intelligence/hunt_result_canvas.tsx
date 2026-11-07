/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { IntelligenceEntity } from './common';
import type { HuntArtifact } from './hunt_artifacts';
import type { HuntActivity } from './hunt_stream_state';
import { StructuredInsightView } from './structured_insight_view';
import type {
  ActivityPath,
  Finding,
  HumanizedEvidence,
  HuntPresentation,
  HuntSeverity,
  SecondaryView,
} from './hunt_result_presentation';
import { buildHuntPresentation } from './hunt_result_presentation';
import type { DirectiveHuntArtifact } from './hunt_directive_artifacts';
import { buildGroundedDirectiveArtifacts, stripDirectiveBlocks } from './hunt_directive_artifacts';
import { HuntDirectiveArtifactView } from './hunt_directive_views';

type HuntStatus = 'running' | 'completed' | 'partial' | 'failed';

interface HuntResultCanvasProps {
  prompt: string;
  /**
   * The accumulated assistant narrative (markdown / labeled lines). Rendered as
   * the primary answer when the hunt produced no structured evidence artifacts,
   * so a valid text answer is never silently dropped.
   */
  content: string;
  artifacts: HuntArtifact[];
  activities: HuntActivity[];
  status: HuntStatus;
  startedAt: number;
  onInvestigateEntity: (entity: IntelligenceEntity) => void;
  onOpenInAgentBuilder: () => void;
  /**
   * Contextual follow-up questions surfaced inside the "What's next" area once
   * the hunt is complete. Rendered as quiet pills; selecting one starts a new
   * hunt via {@link onFollowUp}.
   */
  followUps?: string[];
  onFollowUp?: (question: string) => void;
}

const reveal = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const edgeReveal = keyframes`
  from { stroke-dashoffset: 500; opacity: 0; }
  to { stroke-dashoffset: 0; opacity: 0.7; }
`;

const severityOrder: HuntSeverity[] = ['critical', 'high', 'medium', 'low'];

const statusLabel = (status: HuntStatus): string => {
  switch (status) {
    case 'completed':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.completedStatusLabel',
        { defaultMessage: 'Completed' }
      );
    case 'partial':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.partialStatusLabel',
        { defaultMessage: 'Partial' }
      );
    case 'failed':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.failedStatusLabel',
        { defaultMessage: 'Failed' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.runningStatusLabel',
        { defaultMessage: 'Running' }
      );
  }
};

const statusColor = (status: HuntStatus): 'success' | 'warning' | 'danger' | 'primary' => {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'partial') return 'warning';
  return 'primary';
};

const severityColor = (
  severity: HuntSeverity | undefined
): 'danger' | 'warning' | 'primary' | 'hollow' => {
  if (severity === 'critical') return 'danger';
  if (severity === 'high' || severity === 'medium') return 'warning';
  if (severity === 'low') return 'primary';
  return 'hollow';
};

const progressSentence = (prompt: string, phase: number): string => {
  const lower = prompt.toLowerCase();
  if (phase === 0) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.gatheringProgressDescription',
      { defaultMessage: 'Identifying the relevant security data and time window…' }
    );
  }
  if (phase === 1 && lower.includes('dormant')) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.dormantCorrelationProgressDescription',
      {
        defaultMessage:
          'Comparing account reactivations against authentication and endpoint activity…',
      }
    );
  }
  if (phase === 1) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.correlationProgressDescription',
      { defaultMessage: 'Correlating entities, alerts, and behavior across the returned data…' }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.findingsProgressDescription',
    { defaultMessage: 'Ranking supported findings and preparing analyst-readable evidence…' }
  );
};

const getProgressPhase = (activities: HuntActivity[], artifactCount: number): number => {
  if (artifactCount > 0) return 2;
  const hasQueryActivity = activities.some(({ toolId }) =>
    /(execute_esql|search|alerts|get_entity|list_indices|generate_esql)/i.test(toolId)
  );
  return hasQueryActivity ? 1 : 0;
};

export const HuntResultCanvas: React.FC<HuntResultCanvasProps> = ({
  prompt,
  content,
  artifacts,
  activities,
  status,
  startedAt,
  onInvestigateEntity,
  onOpenInAgentBuilder,
  followUps = [],
  onFollowUp,
}) => {
  const { euiTheme } = useEuiTheme();
  const presentation = useMemo(
    () => buildHuntPresentation({ prompt, artifacts }),
    [artifacts, prompt]
  );

  // Grounded AI-directed artifacts. Directives already grounded upstream (from
  // structured_output) arrive as `directive` artifacts; we also re-derive from
  // the narrative's fenced block against the collected artifacts so a reopened
  // hunt re-renders identically from its saved payload with no LLM call.
  const directiveArtifacts = useMemo<DirectiveHuntArtifact[]>(() => {
    const fromArtifacts = artifacts.filter(
      (artifact): artifact is DirectiveHuntArtifact => artifact.type === 'directive'
    );
    const fromNarrative = buildGroundedDirectiveArtifacts({ narrative: content, artifacts });
    const byId = new Map<string, DirectiveHuntArtifact>();
    [...fromArtifacts, ...fromNarrative].forEach((artifact) => byId.set(artifact.id, artifact));
    return [...byId.values()];
  }, [artifacts, content]);

  // Narrative with any fenced hunt-artifacts directive block removed so the
  // prose renders cleanly (the artifacts render as rich cards instead).
  const narrativeContent = useMemo(() => stripDirectiveBlocks(content), [content]);
  const [selectedEvidence, setSelectedEvidence] = useState<HumanizedEvidence>();
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  );

  useEffect(() => {
    if (status !== 'running') return;
    const timer = window.setInterval(
      () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))),
      1000
    );
    return () => window.clearInterval(timer);
  }, [startedAt, status]);

  const rootStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xl};
    min-width: 0;
    max-width: 1280px;
    margin: 0 auto;
    animation: ${reveal} ${euiTheme.animation.normal} ease-out both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;
  const heroStyle = css`
    position: relative;
    overflow: hidden;
    padding: ${euiTheme.size.xl};
    border-radius: ${euiTheme.border.radius.medium};
    background: linear-gradient(
      135deg,
      ${transparentize(euiTheme.colors.primary, 0.08)},
      ${euiTheme.colors.backgroundBasePlain} 58%
    );

    &::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: ${euiTheme.size.xs};
      background: ${status === 'failed'
        ? euiTheme.colors.danger
        : status === 'completed'
        ? euiTheme.colors.success
        : euiTheme.colors.primary};
    }
  `;
  const heroTopStyle = css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${euiTheme.size.m};
    flex-wrap: wrap;
  `;
  const titleStyle = css`
    max-width: 720px;
    margin-top: ${euiTheme.size.xs};
  `;
  const verdictStyle = css`
    max-width: 780px;
    margin-top: ${euiTheme.size.m};
    font-size: ${euiTheme.size.base};
    line-height: 1.55;
  `;
  const statusRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    flex-wrap: wrap;
  `;
  const takeawaysStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: ${euiTheme.size.s};
    max-width: 850px;
    margin-top: ${euiTheme.size.l};
  `;
  const takeawayStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
    min-width: 0;
    padding: ${euiTheme.size.m};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${transparentize(euiTheme.colors.backgroundBasePlain, 0.8)};
  `;
  const takeawayValueStyle = css`
    font-size: ${euiTheme.size.l};
    line-height: 1;
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.textHeading};
  `;
  const questionStyle = css`
    max-width: 820px;
    margin-top: ${euiTheme.size.m};
    color: ${euiTheme.colors.textSubdued};
  `;
  const progressSurfaceStyle = css`
    padding: ${euiTheme.size.xl};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
  `;
  const stepperStyle = css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${euiTheme.size.s};
    margin-top: ${euiTheme.size.l};

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }
  `;
  const stepStyle = (state: 'done' | 'active' | 'pending') => css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    min-width: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.small};
    color: ${state === 'pending' ? euiTheme.colors.textSubdued : euiTheme.colors.textParagraph};
    background: ${state === 'active'
      ? transparentize(euiTheme.colors.primary, 0.1)
      : 'transparent'};
    font-weight: ${state === 'active'
      ? euiTheme.font.weight.semiBold
      : euiTheme.font.weight.regular};
  `;
  const sectionStyle = css`
    min-width: 0;
  `;
  const sectionHeadingStyle = css`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: ${euiTheme.size.m};
    margin-bottom: ${euiTheme.size.m};
    flex-wrap: wrap;
  `;
  const findingsLayoutStyle = css`
    display: grid;
    grid-template-columns: ${selectedEvidence ? 'minmax(0, 1fr) minmax(300px, 0.44fr)' : '1fr'};
    gap: ${euiTheme.size.l};
    align-items: start;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  `;
  const findingsStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    min-width: 0;
  `;
  const findingStyle = (severity: HuntSeverity | undefined) => css`
    position: relative;
    min-width: 0;
    overflow: hidden;
    cursor: pointer;
    border-left: ${euiTheme.border.width.thick} solid
      ${severity === 'critical'
        ? euiTheme.colors.severity.danger
        : severity === 'high'
        ? euiTheme.colors.severity.risk
        : severity === 'medium'
        ? euiTheme.colors.severity.warning
        : euiTheme.colors.primary};
    transition: transform ${euiTheme.animation.fast} ease,
      border-color ${euiTheme.animation.fast} ease;

    &:hover {
      transform: translateY(-1px);
      border-color: ${euiTheme.colors.accent};
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `;
  const evidenceStyle = css`
    position: sticky;
    top: ${euiTheme.size.m};
    min-width: 0;
    max-height: 720px;
    overflow: auto;
  `;
  // Unified "What's next" area: explore views + recommended steps + follow-ups
  // grouped into one bordered surface with an even internal rhythm, replacing
  // the three separate full-width bands that previously competed.
  const whatsNextStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.l};
    padding: ${euiTheme.size.l};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
  `;
  const whatsNextBlockStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    min-width: 0;
  `;
  const whatsNextDividerStyle = css`
    height: ${euiTheme.border.width.thin};
    background: ${euiTheme.colors.borderBasePlain};
  `;
  const subsectionHeadingStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    color: ${euiTheme.colors.textParagraph};
  `;
  const artifactsSectionStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: ${euiTheme.size.m};
    min-width: 0;
  `;
  const evidenceAccordionStyle = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.emptyShade};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};

    & + & {
      margin-top: ${euiTheme.size.s};
    }
  `;
  const evidenceAccordionBodyStyle = css`
    padding-top: ${euiTheme.size.m};
  `;
  const actionButtonsStyle = css`
    display: flex;
    gap: ${euiTheme.size.s};
    flex-wrap: wrap;
    align-items: center;
  `;
  const followUpRowStyle = css`
    display: flex;
    flex-wrap: wrap;
    gap: ${euiTheme.size.s};
  `;
  const followUpPillStyle = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.m};
    border-radius: ${euiTheme.size.l};
    border: ${euiTheme.border.width.thin} solid ${transparentize(euiTheme.colors.primary, 0.4)};
    background: ${transparentize(euiTheme.colors.primary, 0.06)};
    color: ${euiTheme.colors.primaryText};
    font-size: ${euiTheme.size.m};
    cursor: pointer;
    transition: background-color ${euiTheme.animation.fast} ease;

    &:hover:not(:disabled) {
      background: ${transparentize(euiTheme.colors.primary, 0.14)};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  const phase = getProgressPhase(activities, artifacts.length);
  const visibleFindings = showAllFindings
    ? presentation.findings
    : presentation.findings.slice(0, 4);
  const hiddenFindingCount = Math.max(0, presentation.findings.length - visibleFindings.length);

  // Whether the hunt produced anything structured worth rendering in the rich
  // canvas layout. When it did not (text-only answer, or the model ignored the
  // evidence contract) we render the streamed narrative instead of a hollow
  // "no findings" shell, so a valid answer is never dropped.
  const hasStructuredResult =
    presentation.findings.length > 0 ||
    presentation.activityPaths.length > 0 ||
    presentation.timeline.length > 0 ||
    artifacts.some((artifact) => artifact.type === 'evidence' || artifact.type === 'entity');
  const trimmedContent = narrativeContent.trim();
  const showNarrative = !hasStructuredResult && trimmedContent !== '';

  const summaryToCopy = hasStructuredResult
    ? `${presentation.verdict.title}\n\n${presentation.verdict.summary}\n\n${presentation.findings
        .slice(0, 5)
        .map((finding) => `- ${finding.title}: ${finding.explanation}`)
        .join('\n')}`
    : trimmedContent || presentation.verdict.summary;
  const investigableEntity = presentation.affectedEntities[0];

  return (
    <section css={rootStyle} data-test-subj="entityIntelligenceHuntResultCanvas">
      <header css={heroStyle}>
        <div css={heroTopStyle}>
          <div>
            <EuiText size="xs" color="subdued">
              <span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.investigationLabel',
                  { defaultMessage: 'AI Hunt investigation' }
                )}
              </span>
            </EuiText>
            <EuiTitle size="l" css={titleStyle}>
              <h3>{presentation.verdict.title}</h3>
            </EuiTitle>
          </div>
          <div css={statusRowStyle}>
            <EuiBadge color={statusColor(status)}>{statusLabel(status)}</EuiBadge>
            {status !== 'running' && presentation.verdict.severity ? (
              <EuiBadge color={severityColor(presentation.verdict.severity)}>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.severityBadgeLabel',
                  {
                    defaultMessage: '{severity} priority',
                    values: { severity: presentation.verdict.severity },
                  }
                )}
              </EuiBadge>
            ) : status !== 'running' && presentation.verdict.confidence !== undefined ? (
              <EuiBadge color="hollow">
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.confidenceBadgeLabel',
                  {
                    defaultMessage: '{confidence}% confidence',
                    values: { confidence: presentation.verdict.confidence },
                  }
                )}
              </EuiBadge>
            ) : null}
          </div>
        </div>

        {status !== 'running' ? (
          <>
            {hasStructuredResult ? (
              <EuiText css={verdictStyle}>
                <p>{presentation.verdict.summary}</p>
              </EuiText>
            ) : null}
            {hasStructuredResult && presentation.takeaways.length > 0 ? (
              <div css={takeawaysStyle}>
                {presentation.takeaways.map((takeaway) => (
                  <div key={takeaway.id} css={takeawayStyle}>
                    <EuiIcon type={takeaway.icon} size="m" color="primary" aria-hidden={true} />
                    <div>
                      <div css={takeawayValueStyle}>{takeaway.value}</div>
                      <EuiText size="xs" color="subdued">
                        <span>{takeaway.label}</span>
                      </EuiText>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <div css={questionStyle}>
          <EuiAccordion
            id={`hunt-question-${startedAt}`}
            buttonContent={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.huntQuestionButtonLabel',
              { defaultMessage: 'Hunt question' }
            )}
            paddingSize="s"
          >
            <EuiText size="s" color="subdued">
              <p>{prompt}</p>
            </EuiText>
          </EuiAccordion>
        </div>
      </header>

      {status === 'running' ? (
        <div css={progressSurfaceStyle}>
          <div css={heroTopStyle}>
            <div>
              <EuiTitle size="xs">
                <h4>{progressSentence(prompt, phase)}</h4>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.elapsedProgressDescription',
                    {
                      defaultMessage: '{elapsed} elapsed{sourceSuffix}',
                      values: {
                        elapsed: `${elapsedSeconds}s`,
                        sourceSuffix:
                          presentation.queries.length > 0
                            ? ` · ${presentation.queries.length} queries checked`
                            : '',
                      },
                    }
                  )}
                </p>
              </EuiText>
            </div>
            <EuiText size="xs" color="subdued">
              <span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.phaseProgressLabel',
                  {
                    defaultMessage: 'Phase {current} of {total}',
                    values: { current: phase + 1, total: 3 },
                  }
                )}
              </span>
            </EuiText>
          </div>
          <EuiProgress size="xs" color="accent" value={phase + 1} max={3} />
          <div css={stepperStyle}>
            {[
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.gatheringPhaseLabel',
                { defaultMessage: 'Gathering data' }
              ),
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.correlatingPhaseLabel',
                { defaultMessage: 'Correlating behavior' }
              ),
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.buildingPhaseLabel',
                { defaultMessage: 'Building findings' }
              ),
            ].map((label, index) => {
              const stepState = index < phase ? 'done' : index === phase ? 'active' : 'pending';
              return (
                <div key={label} css={stepStyle(stepState)}>
                  <EuiIcon
                    type={stepState === 'done' ? 'checkCircleFill' : 'dot'}
                    color={stepState === 'pending' ? 'subdued' : 'primary'}
                    aria-hidden={true}
                  />
                  <EuiText size="s">
                    <span>{label}</span>
                  </EuiText>
                </div>
              );
            })}
          </div>
        </div>
      ) : showNarrative ? (
        <NarrativeResult content={trimmedContent} onOpenInAgentBuilder={onOpenInAgentBuilder} />
      ) : (
        <>
          <section css={sectionStyle}>
            <div css={sectionHeadingStyle}>
              <div>
                <EuiTitle size="m">
                  <h3>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.keyFindingsTitle',
                      { defaultMessage: 'Key findings' }
                    )}
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.keyFindingsDescription',
                      {
                        defaultMessage: 'Prioritized by supported severity and evidence strength.',
                      }
                    )}
                  </p>
                </EuiText>
              </div>
            </div>

            <div css={findingsLayoutStyle}>
              <div css={findingsStyle}>
                {visibleFindings.length > 0 ? (
                  visibleFindings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      onSelect={setSelectedEvidence}
                      onInvestigateEntity={onInvestigateEntity}
                      style={findingStyle(finding.severity)}
                    />
                  ))
                ) : (
                  <EuiPanel hasBorder={false} color="subdued" paddingSize="l">
                    <EuiText>
                      <p>{presentation.verdict.summary}</p>
                    </EuiText>
                  </EuiPanel>
                )}
                {hiddenFindingCount > 0 ? (
                  <EuiButtonEmpty
                    size="s"
                    iconType="chevronSingleDown"
                    onClick={() => setShowAllFindings(true)}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.showMoreFindingsButtonLabel',
                      {
                        defaultMessage:
                          'Show {count, plural, one {# more finding} other {# more findings}}',
                        values: { count: hiddenFindingCount },
                      }
                    )}
                  </EuiButtonEmpty>
                ) : showAllFindings && presentation.findings.length > 4 ? (
                  <EuiButtonEmpty
                    size="s"
                    iconType="chevronSingleUp"
                    onClick={() => setShowAllFindings(false)}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.showFewerFindingsButtonLabel',
                      { defaultMessage: 'Show fewer findings' }
                    )}
                  </EuiButtonEmpty>
                ) : null}
              </div>
              {selectedEvidence ? (
                <HumanizedEvidencePanel
                  evidence={selectedEvidence}
                  onClose={() => setSelectedEvidence(undefined)}
                  style={evidenceStyle}
                />
              ) : null}
            </div>
          </section>

          {directiveArtifacts.length > 0 ? (
            <section css={sectionStyle} data-test-subj="entityIntelligenceHuntArtifacts">
              <div css={sectionHeadingStyle}>
                <div>
                  <EuiTitle size="m">
                    <h3>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.attachmentsTitle',
                        { defaultMessage: 'Evidence attachments' }
                      )}
                    </h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.attachmentsDescription',
                        {
                          defaultMessage:
                            'Rich views the analysis surfaced, each grounded in this hunt’s real query results.',
                        }
                      )}
                    </p>
                  </EuiText>
                </div>
              </div>
              <div css={artifactsSectionStyle}>
                {directiveArtifacts.map((artifact) => (
                  <HuntDirectiveArtifactView key={artifact.id} artifact={artifact} />
                ))}
              </div>
            </section>
          ) : null}

          <section css={whatsNextStyle} data-test-subj="entityIntelligenceHuntWhatsNext">
            {presentation.secondaryViews.length > 0 ? (
              <div css={whatsNextBlockStyle}>
                <div css={subsectionHeadingStyle}>
                  <EuiIcon type="inspect" size="m" color="primary" aria-hidden={true} />
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.exploreEvidenceTitle',
                        { defaultMessage: 'Explore the evidence' }
                      )}
                    </h3>
                  </EuiTitle>
                </div>
                <div data-test-subj="entityIntelligenceHuntEvidenceViews">
                  {presentation.secondaryViews.map((view, index) => (
                    <div key={view} css={evidenceAccordionStyle}>
                      <EuiAccordion
                        id={`hunt-evidence-${view}-${startedAt}`}
                        initialIsOpen={index === 0}
                        buttonContent={<SecondaryViewLabel view={view} />}
                        paddingSize="none"
                        data-test-subj={`entityIntelligenceHuntEvidenceView-${view}`}
                      >
                        <div css={evidenceAccordionBodyStyle}>
                          <SecondaryViewContent
                            view={view}
                            presentation={presentation}
                            onSelectEvidence={setSelectedEvidence}
                          />
                        </div>
                      </EuiAccordion>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {presentation.secondaryViews.length > 0 ? <div css={whatsNextDividerStyle} /> : null}

            <div css={whatsNextBlockStyle}>
              <div css={subsectionHeadingStyle}>
                <EuiIcon type="checkCircleFill" size="m" color="success" aria-hidden={true} />
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.nextStepsTitle',
                      { defaultMessage: 'Recommended next steps' }
                    )}
                  </h3>
                </EuiTitle>
              </div>
              <EuiText size="s" color="subdued">
                {presentation.recommendations.length > 0 ? (
                  <ul>
                    {presentation.recommendations.slice(0, 4).map((recommendation) => (
                      <li key={recommendation}>{recommendation}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.safeNextStepsDescription',
                      {
                        defaultMessage:
                          'Review the highest-priority finding, validate the affected entities, and preserve the supporting query evidence.',
                      }
                    )}
                  </p>
                )}
              </EuiText>
              <div css={actionButtonsStyle}>
                {investigableEntity ? (
                  <EuiButton
                    size="s"
                    iconType="inspect"
                    onClick={() => onInvestigateEntity(investigableEntity)}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.investigateEntityButtonLabel',
                      { defaultMessage: 'Investigate affected entity' }
                    )}
                  </EuiButton>
                ) : null}
                <EuiButtonEmpty size="s" iconType="external" onClick={onOpenInAgentBuilder}>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.openAgentBuilderButtonLabel',
                    { defaultMessage: 'Open full hunt' }
                  )}
                </EuiButtonEmpty>
                <EuiCopy textToCopy={summaryToCopy}>
                  {(copy) => (
                    <EuiButtonEmpty size="s" iconType="copy" onClick={copy}>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.copySummaryButtonLabel',
                        { defaultMessage: 'Copy summary' }
                      )}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </div>
            </div>

            {onFollowUp && followUps.length > 0 ? (
              <>
                <div css={whatsNextDividerStyle} />
                <div css={whatsNextBlockStyle}>
                  <div css={subsectionHeadingStyle}>
                    <EuiIcon type="comment" size="m" color="primary" aria-hidden={true} />
                    <EuiTitle size="xs">
                      <h3>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.askFollowUpTitle',
                          { defaultMessage: 'Ask a follow-up' }
                        )}
                      </h3>
                    </EuiTitle>
                  </div>
                  <div
                    css={followUpRowStyle}
                    data-test-subj="entityIntelligenceHuntCanvasFollowUps"
                  >
                    {followUps.map((question) => (
                      <button
                        key={question}
                        type="button"
                        css={followUpPillStyle}
                        onClick={() => onFollowUp(question)}
                        data-test-subj="entityIntelligenceHuntFollowUp"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </>
      )}

      <EuiAccordion
        id={`hunt-analysis-details-${startedAt}`}
        buttonContent={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.analysisDetailsButtonLabel',
          { defaultMessage: 'Analysis details' }
        )}
        paddingSize="m"
      >
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.analysisDetailsDescription',
              {
                defaultMessage:
                  '{queryCount, plural, one {# query} other {# queries}} and {stepCount, plural, one {# analysis step} other {# analysis steps}}',
                values: {
                  queryCount: presentation.queries.length,
                  stepCount: activities.length,
                },
              }
            )}
          </p>
        </EuiText>
        {presentation.queries.map(({ id, query, toolId }) => (
          <div key={id}>
            <EuiText size="xs" color="subdued">
              <span>{toolId}</span>
            </EuiText>
            <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable>
              {query}
            </EuiCodeBlock>
          </div>
        ))}
        {presentation.unknownArtifacts.length > 0 ? (
          <EuiCodeBlock fontSize="s" paddingSize="s" overflowHeight={220}>
            {JSON.stringify(
              presentation.unknownArtifacts.map((artifact) =>
                artifact.type === 'tool_result'
                  ? {
                      toolId: artifact.toolId,
                      resultType: artifact.resultType,
                      details: artifact.details,
                    }
                  : {}
              ),
              null,
              2
            )}
          </EuiCodeBlock>
        ) : null}
      </EuiAccordion>
    </section>
  );
};

const NarrativeResult: React.FC<{
  content: string;
  onOpenInAgentBuilder: () => void;
}> = ({ content, onOpenInAgentBuilder }) => {
  const { euiTheme } = useEuiTheme();
  const wrapperStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.l};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    min-width: 0;
    overflow-wrap: anywhere;
  `;
  return (
    <section css={wrapperStyle} data-test-subj="entityIntelligenceHuntNarrative">
      <EuiText size="xs" color="subdued">
        <span>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.narrativeLabel',
            { defaultMessage: 'Hunt response' }
          )}
        </span>
      </EuiText>
      <StructuredInsightView content={content} />
      <div>
        <EuiButtonEmpty size="s" iconType="external" onClick={onOpenInAgentBuilder}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.openAgentBuilderButtonLabel',
            { defaultMessage: 'Open full hunt' }
          )}
        </EuiButtonEmpty>
      </div>
    </section>
  );
};

const FindingCard: React.FC<{
  finding: Finding;
  onSelect: (evidence: HumanizedEvidence) => void;
  onInvestigateEntity: (entity: IntelligenceEntity) => void;
  style: ReturnType<typeof css>;
}> = ({ finding, onSelect, onInvestigateEntity, style }) => {
  const { euiTheme } = useEuiTheme();
  const explanationStyle = css`
    max-width: 760px;
    margin-top: ${euiTheme.size.xs};
  `;
  const metadataStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    flex-wrap: wrap;
    margin-top: ${euiTheme.size.s};
  `;
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      css={style}
      onClick={() => onSelect(finding.evidence)}
    >
      <div>
        <EuiTitle size="xs">
          <h4>{finding.title}</h4>
        </EuiTitle>
        <EuiText size="s" css={explanationStyle}>
          <p>{finding.explanation}</p>
        </EuiText>
        {finding.whyItMatters ? (
          <EuiText size="xs" color="subdued">
            <p>
              <strong>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.whyItMattersLabel',
                  { defaultMessage: 'Why this matters:' }
                )}
              </strong>{' '}
              {finding.whyItMatters}
            </p>
          </EuiText>
        ) : null}
        <div css={metadataStyle}>
          {finding.severity ? (
            <EuiBadge color={severityColor(finding.severity)}>{finding.severity}</EuiBadge>
          ) : null}
          {finding.entities.slice(0, 4).map((entity) => (
            <EuiBadge key={entity} color="hollow">
              {entity}
            </EuiBadge>
          ))}
          <EuiText size="xs" color="subdued">
            <span>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.evidenceCountLabel',
                {
                  defaultMessage:
                    '{count, plural, one {# supporting event} other {# supporting events}}',
                  values: { count: finding.evidenceCount },
                }
              )}
            </span>
          </EuiText>
          {finding.timestamp ? (
            <EuiText size="xs" color="subdued">
              <span>{new Date(finding.timestamp).toLocaleString()}</span>
            </EuiText>
          ) : null}
        </div>
        {finding.entity && finding.canInvestigate ? (
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType="inspect"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onInvestigateEntity(finding.entity as IntelligenceEntity);
            }}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.investigateFindingButtonLabel',
              { defaultMessage: 'Investigate in Explorer' }
            )}
          </EuiButtonEmpty>
        ) : null}
      </div>
    </EuiPanel>
  );
};

const HumanizedEvidencePanel: React.FC<{
  evidence: HumanizedEvidence;
  onClose: () => void;
  style: ReturnType<typeof css>;
}> = ({ evidence, onClose, style }) => {
  const { euiTheme } = useEuiTheme();
  const sectionStyle = css`
    margin-top: ${euiTheme.size.m};
    padding-top: ${euiTheme.size.m};
    border-top: ${euiTheme.border.thin};
  `;
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" css={style}>
      <EuiButtonEmpty size="xs" flush="right" iconType="cross" onClick={onClose}>
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.closeEvidenceButtonLabel',
          { defaultMessage: 'Close' }
        )}
      </EuiButtonEmpty>
      <EuiTitle size="s">
        <h4>{evidence.title}</h4>
      </EuiTitle>
      {evidence.sections.map((evidenceSection) => (
        <div key={evidenceSection.id} css={sectionStyle}>
          <EuiTitle size="xxs">
            <h5>{evidenceSection.title}</h5>
          </EuiTitle>
          <EuiDescriptionList
            type="responsiveColumn"
            compressed
            listItems={evidenceSection.fields.map((evidenceField) => ({
              title: evidenceField.label,
              description:
                evidenceField.kind === 'entity' || evidenceField.kind === 'ip' ? (
                  <EuiBadge color="hollow">{evidenceField.value}</EuiBadge>
                ) : evidenceField.kind === 'code' ? (
                  <code>{evidenceField.value}</code>
                ) : (
                  evidenceField.value
                ),
            }))}
          />
        </div>
      ))}
      <div css={sectionStyle}>
        <EuiAccordion
          id={`raw-evidence-${encodeURIComponent(evidence.title)}`}
          buttonContent={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.rawDocumentButtonLabel',
            { defaultMessage: 'Raw document' }
          )}
          paddingSize="s"
        >
          <EuiCodeBlock fontSize="s" paddingSize="s" overflowHeight={260}>
            {JSON.stringify(evidence.raw, null, 2)}
          </EuiCodeBlock>
        </EuiAccordion>
      </div>
    </EuiPanel>
  );
};

const SECONDARY_VIEW_CONFIG: Record<SecondaryView, { icon: string; title: string }> = {
  activity_path: {
    icon: 'merge',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.activityPathTitle',
      { defaultMessage: 'Activity path' }
    ),
  },
  timeline: {
    icon: 'clock',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.timelineTitle',
      { defaultMessage: 'Timeline' }
    ),
  },
  risk: {
    icon: 'visGauge',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.riskBreakdownTitle',
      { defaultMessage: 'Risk breakdown' }
    ),
  },
  sessions: {
    icon: 'users',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.sessionsTitle',
      { defaultMessage: 'Sessions & related entities' }
    ),
  },
};

/** Compact icon + title used as the inline evidence accordion button. */
const SecondaryViewLabel: React.FC<{ view: SecondaryView }> = ({ view }) => {
  const config = SECONDARY_VIEW_CONFIG[view];
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={config.icon} color="primary" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h4>{config.title}</h4>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SecondaryViewContent: React.FC<{
  view: SecondaryView;
  presentation: HuntPresentation;
  onSelectEvidence: (evidence: HumanizedEvidence) => void;
}> = ({ view, presentation, onSelectEvidence }) => {
  if (view === 'activity_path') {
    return (
      <ActivityPathView paths={presentation.activityPaths} onSelectEvidence={onSelectEvidence} />
    );
  }
  if (view === 'timeline') {
    return <TimelineView presentation={presentation} onSelectEvidence={onSelectEvidence} />;
  }
  if (view === 'sessions') {
    return <SessionsView presentation={presentation} onSelectEvidence={onSelectEvidence} />;
  }
  return <RiskView presentation={presentation} />;
};

const ActivityPathView: React.FC<{
  paths: ActivityPath[];
  onSelectEvidence: (evidence: HumanizedEvidence) => void;
}> = ({ paths, onSelectEvidence }) => {
  const { euiTheme } = useEuiTheme();
  const introStyle = css`
    max-width: 760px;
    margin-bottom: ${euiTheme.size.l};
  `;
  const pathCardsStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
  `;
  const pathStyle = css`
    display: grid;
    grid-template-columns: minmax(120px, 1fr) auto minmax(120px, 1fr) auto minmax(120px, 1fr);
    align-items: center;
    gap: ${euiTheme.size.s};
    cursor: pointer;

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }
  `;
  if (paths.length <= 2) {
    return (
      <>
        <EuiText size="s" color="subdued" css={introStyle}>
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.pathExplainerDescription',
              {
                defaultMessage:
                  'Each directed path shows who or what initiated activity, the observed action, and where it went.',
              }
            )}
          </p>
        </EuiText>
        <div css={pathCardsStyle}>
          {paths.map((path) => (
            <EuiPanel
              key={path.id}
              hasBorder
              hasShadow={false}
              paddingSize="m"
              css={pathStyle}
              onClick={() => onSelectEvidence(path.evidence)}
            >
              <PathNode
                label={path.source}
                caption={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.sourceNodeLabel',
                  { defaultMessage: 'Source' }
                )}
              />
              <EuiIcon type="sortRight" color="primary" aria-hidden={true} />
              <PathNode
                label={path.action}
                caption={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.actionNodeLabel',
                  { defaultMessage: 'Process or action' }
                )}
              />
              <EuiIcon type="sortRight" color="primary" aria-hidden={true} />
              <PathNode
                label={path.destination}
                caption={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.destinationNodeLabel',
                  { defaultMessage: 'Destination' }
                )}
              />
              <EuiText size="xs" color="subdued">
                <p>{path.sentence}</p>
              </EuiText>
            </EuiPanel>
          ))}
        </div>
      </>
    );
  }
  return <DirectedPathSvg paths={paths.slice(0, 10)} onSelectEvidence={onSelectEvidence} />;
};

const PathNode: React.FC<{ label: string; caption: string }> = ({ label, caption }) => {
  const { euiTheme } = useEuiTheme();
  const nodeStyle = css`
    min-width: 0;
    padding: ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.primary, 0.08)};
    overflow-wrap: anywhere;
  `;
  return (
    <div css={nodeStyle}>
      <EuiText size="xs" color="subdued">
        <span>{caption}</span>
      </EuiText>
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
    </div>
  );
};

const DirectedPathSvg: React.FC<{
  paths: ActivityPath[];
  onSelectEvidence: (evidence: HumanizedEvidence) => void;
}> = ({ paths, onSelectEvidence }) => {
  const { euiTheme } = useEuiTheme();
  const height = Math.max(320, paths.length * 66 + 70);
  const wrapperStyle = css`
    min-width: 0;
    overflow-x: auto;
  `;
  const svgStyle = css`
    width: 100%;
    min-width: 760px;
    height: auto;

    path {
      stroke-dasharray: 500;
      animation: ${edgeReveal} ${euiTheme.animation.slow} ease-out forwards;
      cursor: pointer;
    }

    @media (prefers-reduced-motion: reduce) {
      path {
        stroke-dasharray: none;
        animation: none;
      }
    }
  `;
  return (
    <div css={wrapperStyle}>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.directedPathExplainerDescription',
            {
              defaultMessage:
                'Arrows show observed direction. Thicker paths represent more supporting events.',
            }
          )}
        </p>
      </EuiText>
      <svg
        viewBox={`0 0 960 ${height}`}
        css={svgStyle}
        role="img"
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.activityPathAriaLabel',
          { defaultMessage: 'Directed activity paths from source through action to destination' }
        )}
      >
        <defs>
          <marker
            id="hunt-path-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={euiTheme.colors.primary} />
          </marker>
        </defs>
        <text x="110" y="28" fill={euiTheme.colors.textSubdued} textAnchor="middle">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.sourceColumnLabel',
            { defaultMessage: 'SOURCE' }
          )}
        </text>
        <text x="480" y="28" fill={euiTheme.colors.textSubdued} textAnchor="middle">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.actionColumnLabel',
            { defaultMessage: 'PROCESS / ACTION' }
          )}
        </text>
        <text x="850" y="28" fill={euiTheme.colors.textSubdued} textAnchor="middle">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.destinationColumnLabel',
            { defaultMessage: 'DESTINATION' }
          )}
        </text>
        {paths.map((path, index) => {
          const y = 68 + index * 66;
          const strokeWidth = Math.min(12, 2 + Math.log2(path.count + 1) * 1.5);
          const stroke =
            path.severity === 'critical'
              ? euiTheme.colors.severity.danger
              : path.severity === 'high'
              ? euiTheme.colors.severity.risk
              : path.severity === 'medium'
              ? euiTheme.colors.severity.warning
              : euiTheme.colors.primary;
          return (
            <g key={path.id} onClick={() => onSelectEvidence(path.evidence)}>
              <path
                d={`M 185 ${y} C 285 ${y}, 330 ${y}, 405 ${y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                markerEnd="url(#hunt-path-arrow)"
              />
              <path
                d={`M 555 ${y} C 650 ${y}, 690 ${y}, 775 ${y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                markerEnd="url(#hunt-path-arrow)"
              />
              <rect
                x="25"
                y={y - 18}
                width="160"
                height="36"
                rx="5"
                fill={euiTheme.colors.backgroundBasePlain}
                stroke={euiTheme.colors.borderBasePlain}
              />
              <rect
                x="405"
                y={y - 18}
                width="150"
                height="36"
                rx="5"
                fill={transparentize(euiTheme.colors.primary, 0.1)}
                stroke={euiTheme.colors.primary}
              />
              <rect
                x="775"
                y={y - 18}
                width="160"
                height="36"
                rx="5"
                fill={euiTheme.colors.backgroundBasePlain}
                stroke={euiTheme.colors.borderBasePlain}
              />
              <text x="105" y={y + 4} textAnchor="middle" fill={euiTheme.colors.textParagraph}>
                {path.source.slice(0, 22)}
              </text>
              <text x="480" y={y + 4} textAnchor="middle" fill={euiTheme.colors.textParagraph}>
                {path.action.slice(0, 20)}
              </text>
              <text x="855" y={y + 4} textAnchor="middle" fill={euiTheme.colors.textParagraph}>
                {path.destination.slice(0, 22)}
              </text>
              <text x="295" y={y - 10} textAnchor="middle" fill={euiTheme.colors.textSubdued}>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.pathEventCountLabel',
                  {
                    defaultMessage: '{count, plural, one {# event} other {# events}}',
                    values: { count: path.count },
                  }
                )}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const TimelineView: React.FC<{
  presentation: HuntPresentation;
  onSelectEvidence: (evidence: HumanizedEvidence) => void;
}> = ({ presentation, onSelectEvidence }) => {
  const { euiTheme } = useEuiTheme();
  const timelineStyle = css`
    display: flex;
    gap: ${euiTheme.size.s};
    overflow-x: auto;
    padding: ${euiTheme.size.s} 0;
  `;
  const itemStyle = css`
    flex: 0 0 220px;
    border-top: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
    cursor: pointer;
  `;
  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.timelineExplainerDescription',
            { defaultMessage: 'Events are ordered from earliest to latest observed activity.' }
          )}
        </p>
      </EuiText>
      <div css={timelineStyle}>
        {presentation.timeline.slice(0, 30).map((item) => (
          <EuiPanel
            key={item.id}
            hasBorder
            hasShadow={false}
            paddingSize="m"
            css={itemStyle}
            onClick={() => onSelectEvidence(item.evidence)}
          >
            <EuiText size="xs" color="subdued">
              <span>{new Date(item.timestamp).toLocaleString()}</span>
            </EuiText>
            <EuiText size="s">
              <strong>{item.title}</strong>
            </EuiText>
            {item.severity ? (
              <EuiBadge color={severityColor(item.severity)}>{item.severity}</EuiBadge>
            ) : null}
          </EuiPanel>
        ))}
      </div>
    </>
  );
};

const SessionsView: React.FC<{
  presentation: HuntPresentation;
  onSelectEvidence: (evidence: HumanizedEvidence) => void;
}> = ({ presentation }) => {
  const { euiTheme } = useEuiTheme();
  const listStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
  `;
  const rowStyle = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.small};
    min-width: 0;
  `;
  const iconFor = (type: string | undefined): string =>
    type === 'host' ? 'storage' : type === 'service' ? 'vectorTriangle' : 'user';
  const minWidthZero = css`
    min-width: 0;
  `;
  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.sessionsExplainerDescription',
            {
              defaultMessage:
                'Entities seen in this hunt’s evidence, with observed event and alert counts.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <div css={listStyle} data-test-subj="entityIntelligenceHuntSessions">
        {presentation.sessions.slice(0, 12).map((session) => (
          <div key={session.id} css={rowStyle}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={minWidthZero}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={iconFor(session.type)} color="primary" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={minWidthZero}>
                <EuiText size="s">
                  <strong>{session.name}</strong>
                </EuiText>
              </EuiFlexItem>
              {session.severity ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color={severityColor(session.severity)}>{session.severity}</EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiText size="xs" color="subdued">
              <span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.sessionCounts',
                  {
                    defaultMessage:
                      '{events, plural, one {# event} other {# events}} · {alerts, plural, one {# alert} other {# alerts}}',
                    values: { events: session.eventCount, alerts: session.alertCount },
                  }
                )}
              </span>
            </EuiText>
          </div>
        ))}
      </div>
    </>
  );
};

const RiskView: React.FC<{ presentation: HuntPresentation }> = ({ presentation }) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(...presentation.riskBuckets.map(({ count }) => count), 1);
  const barsStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.m};
    max-width: 760px;
  `;
  const trackStyle = css`
    height: ${euiTheme.size.s};
    border-radius: ${euiTheme.size.s};
    background: ${euiTheme.colors.backgroundBasePlain};
    overflow: hidden;
  `;
  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.canvas.riskExplainerDescription',
            {
              defaultMessage: 'This breakdown uses only severity present in validated findings.',
            }
          )}
        </p>
      </EuiText>
      <div css={barsStyle}>
        {severityOrder.flatMap((severity) => {
          const bucket = presentation.riskBuckets.find(
            ({ severity: bucketSeverity }) => bucketSeverity === severity
          );
          if (!bucket) return [];
          return [
            <div key={severity}>
              <EuiText size="s">
                <strong>{severity.toUpperCase()}</strong>
                {' · '}
                {bucket.count.toLocaleString()}
              </EuiText>
              <div css={trackStyle}>
                <div
                  css={css`
                    width: ${(bucket.count / max) * 100}%;
                    height: 100%;
                    background: ${severity === 'critical'
                      ? euiTheme.colors.severity.danger
                      : severity === 'high'
                      ? euiTheme.colors.severity.risk
                      : severity === 'medium'
                      ? euiTheme.colors.severity.warning
                      : euiTheme.colors.severity.neutral};
                  `}
                />
              </div>
            </div>,
          ];
        })}
      </div>
    </>
  );
};

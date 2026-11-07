/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana, useDateFormat, useTimeZone } from '../../../common/lib/kibana';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useConverseOnce } from './hooks/use_converse_api';
import { useExecutiveBriefAgents } from './hooks/use_executive_brief_agents';
import { parseExecutiveBrief } from './structured_insight';
import { ExecutiveBriefMetrics } from './executive_brief_metrics';
import { ExecutiveBriefExportButton } from './executive_brief_pdf';
import { ExecutiveBriefAgentEvidence } from './executive_brief_agent_evidence';
import type { ExecutiveBriefAgentEvidenceProps } from './executive_brief_agent_evidence';
import {
  briefCoverageSourceLabel,
  briefCoverageStatusLabel,
  briefLimitationLabel,
} from './executive_brief_presentation';
import type { ExecutiveBriefCoverage } from './executive_brief_agents';
import { captureExecutiveBrief, hasExecutiveBriefAccessLoss } from './executive_brief_snapshot';
import type { ExecutiveBriefInputs, ExecutiveBriefSnapshot } from './executive_brief_snapshot';

export interface ExecutiveBriefModalProps
  extends Omit<ExecutiveBriefInputs, 'spaceId' | 'agents'>,
    Pick<
      ExecutiveBriefAgentEvidenceProps,
      | 'onInvestigateAgent'
      | 'onInvestigateCodex'
      | 'onInvestigateCursor'
      | 'onInvestigateClaudeDesktop'
      | 'onInvestigateGoogleAdk'
    > {
  onClose: () => void;
  onInvestigate: (entity: ExecutiveBriefInputs['entities'][number]) => void;
}

/** Captures one evidence snapshot for the assessment, supporting visuals and export. */
export const ExecutiveBriefModal: React.FC<ExecutiveBriefModalProps> = ({
  onClose,
  stats,
  entities,
  tactics,
  rules,
  matrix,
  leads,
  leadsCount,
  anomalies,
  coverage,
  onInvestigate,
  onInvestigateAgent,
  onInvestigateCodex,
  onInvestigateCursor,
  onInvestigateClaudeDesktop,
  onInvestigateGoogleAdk,
}) => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useKibana().services;
  const spaceId = useSpaceId();
  const dateFormat = useDateFormat();
  const timeZone = useTimeZone();
  const formatTimestamp = (value: number): string =>
    `${moment.tz(value, timeZone).format(dateFormat)} ${moment.tz(value, timeZone).format('z')}`;
  const titleId = useGeneratedHtmlId({ prefix: 'executiveBrief' });
  const agents = useExecutiveBriefAgents(spaceId);
  const {
    generate,
    result,
    isGenerating,
    error,
    generatedAt,
    connectorName,
    reset,
    hasConnector,
    isConnectorLoading,
  } = useConverseOnce();
  const [snapshot, setSnapshot] = useState<ExecutiveBriefSnapshot>();
  const autoStarted = useRef(false);
  const inputs = useMemo(
    () => ({
      spaceId,
      stats,
      entities,
      tactics,
      rules,
      matrix,
      leads,
      leadsCount,
      anomalies,
      coverage,
      agents: agents.snapshot,
    }),
    [
      spaceId,
      stats,
      entities,
      tactics,
      rules,
      matrix,
      leads,
      leadsCount,
      anomalies,
      coverage,
      agents.snapshot,
    ]
  );
  const sourcesLoading =
    !spaceId || Object.values(coverage).some((status) => status === 'loading') || agents.isLoading;
  const accessLost = snapshot !== undefined && hasExecutiveBriefAccessLoss(snapshot, inputs);
  const displayed = accessLost ? undefined : snapshot;
  const parsed = useMemo(() => (result ? parseExecutiveBrief(result) : undefined), [result]);

  useEffect(() => {
    if (accessLost) {
      reset();
      setSnapshot(undefined);
      autoStarted.current = true;
    } else if (!snapshot && !sourcesLoading && !agents.isRefreshing) {
      setSnapshot(captureExecutiveBrief(inputs, Date.now()));
    }
  }, [accessLost, agents.isRefreshing, inputs, reset, snapshot, sourcesLoading]);

  useEffect(() => {
    if (
      autoStarted.current ||
      !displayed ||
      !hasConnector ||
      isConnectorLoading ||
      sourcesLoading ||
      agents.isRefreshing
    )
      return;
    autoStarted.current = true;
    generate(displayed.prompt);
  }, [agents.isRefreshing, displayed, generate, hasConnector, isConnectorLoading, sourcesLoading]);

  const regenerate = useCallback(() => {
    if (sourcesLoading || agents.isRefreshing) return;
    const next = captureExecutiveBrief(inputs, Date.now());
    autoStarted.current = true;
    reset();
    setSnapshot(next);
    if (hasConnector) generate(next.prompt);
  }, [agents.isRefreshing, generate, hasConnector, inputs, reset, sourcesLoading]);

  const selectEntity = useCallback(
    (id: string) => {
      const match = displayed?.entities.find((entity) => entity.id === id);
      if (match) {
        onClose();
        onInvestigate(match);
      }
    },
    [displayed, onClose, onInvestigate]
  );
  const openAgent = (id: string) => {
    onClose();
    onInvestigateAgent?.(id);
  };
  const openCodex = (key: string) => {
    onClose();
    onInvestigateCodex?.(key);
  };
  const openCursor = (key: string) => {
    onClose();
    onInvestigateCursor?.(key);
  };
  const openClaudeDesktop = (key: string) => {
    onClose();
    onInvestigateClaudeDesktop?.(key);
  };
  const openGoogleAdk = (key: string) => {
    onClose();
    onInvestigateGoogleAdk?.(key);
  };
  const handlePopupBlocked = useCallback(
    (title: string, text: string) => {
      notifications.toasts.addWarning({ title, text });
    },
    [notifications.toasts]
  );
  const row = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.m,
    flexWrap: 'wrap',
  });
  const panel = css({
    padding: euiTheme.size.l,
    border: euiTheme.border.thin,
    borderRadius: euiTheme.border.radius.medium,
  });
  const small = css({
    fontSize: euiTheme.size.m,
    color: euiTheme.colors.textSubdued,
    lineHeight: 1.5,
  });
  const number = (value: number | undefined): string =>
    value === undefined ? '—' : value.toLocaleString();
  const capturedAtLabel = displayed
    ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.snapshotAt', {
        defaultMessage: 'Snapshot captured {timestamp}',
        values: { timestamp: formatTimestamp(displayed.capturedAt) },
      })
    : '';
  const unifiedCount =
    displayed?.stats &&
    displayed.coverage.entityStore === 'available' &&
    displayed.agents.totals.agentIdentities !== undefined
      ? displayed.stats.totalEntities + displayed.agents.totals.agentIdentities
      : undefined;
  const metrics = [
    {
      icon: 'users',
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.brief.identityMetric',
        { defaultMessage: 'Identities observed' }
      ),
      value: unifiedCount,
      detail: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.brief.identityMetricDetail',
        { defaultMessage: 'People, systems and AI agents' }
      ),
    },
    {
      icon: 'warning',
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.brief.riskMetric',
        { defaultMessage: 'High / critical risk' }
      ),
      value: displayed?.data.kpis.find((kpi) => kpi.id === 'materialRisk')?.value,
      detail: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.brief.riskMetricDetail',
        { defaultMessage: 'Scored entity population' }
      ),
    },
    {
      icon: 'nested',
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.brief.sessionMetric',
        { defaultMessage: 'Sessions & MCP connections' }
      ),
      value: displayed?.agents.totals.externalSessions,
      detail: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.brief.sessionMetricDetail',
        { defaultMessage: 'Codex, Cursor & Claude Desktop activity' }
      ),
    },
    {
      icon: 'visBarVertical',
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.brief.changedMetric',
        { defaultMessage: 'Sessions with changes' }
      ),
      value: displayed?.agents.totals.evaluatedSessions
        ? displayed.agents.totals.changedSessions
        : undefined,
      detail: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.brief.changedMetricDetail',
        {
          defaultMessage: '{count} with comparable history',
          values: { count: number(displayed?.agents.totals.evaluatedSessions) },
        }
      ),
    },
  ];

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css({ width: 1120, maxWidth: '96vw', maxBlockSize: '92vh' })}
      data-test-subj="entityIntelligenceExecutiveBriefModal"
    >
      <EuiModalHeader>
        <div css={css({ width: '100%' })}>
          <div css={row}>
            <EuiIcon type="document" size="xl" color="primary" aria-hidden={true} />
            <EuiTitle size="m">
              <h1 id={titleId}>
                {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.title', {
                  defaultMessage: 'Identity intelligence brief',
                })}
              </h1>
            </EuiTitle>
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.executiveView',
                { defaultMessage: 'Executive view' }
              )}
            </EuiBadge>
          </div>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.subtitle',
                {
                  defaultMessage:
                    'What matters across people, systems and AI agents — and where to act next.',
                }
              )}
            </p>
          </EuiText>
          {displayed ? (
            <div css={small} data-test-subj="executiveBriefCapturedAt">
              {capturedAtLabel}
              {' · '}
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.snapshotScope',
                { defaultMessage: 'Current entity risk · agent activity seen in the last 30 days' }
              )}
            </div>
          ) : null}
        </div>
      </EuiModalHeader>
      <EuiModalBody>
        {!displayed ? (
          <div data-test-subj="executiveBriefSourcesLoading">
            <EuiSkeletonText lines={5} />
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.brief.collecting',
                  { defaultMessage: 'Gathering identity and agent evidence…' }
                )}
              </p>
            </EuiText>
          </div>
        ) : (
          <>
            <div
              css={css({
                display: 'grid',
                gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
                gap: euiTheme.size.s,
                '@media (max-width:700px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' },
              })}
              data-test-subj="executiveBriefHeadlineMetrics"
            >
              {metrics.map((item) => (
                <div
                  key={item.label}
                  css={css({
                    padding: euiTheme.size.m,
                    border: euiTheme.border.thin,
                    borderRadius: euiTheme.border.radius.medium,
                    background: transparentize(euiTheme.colors.primary, 0.035),
                  })}
                >
                  <div
                    css={css({
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: euiTheme.size.xs,
                    })}
                  >
                    <span css={small}>{item.label}</span>
                    <EuiIcon type={item.icon} color="subdued" aria-hidden={true} />
                  </div>
                  <div
                    css={css({
                      fontSize: 30,
                      fontWeight: euiTheme.font.weight.bold,
                      paddingTop: euiTheme.size.s,
                      paddingBottom: euiTheme.size.xs,
                    })}
                  >
                    {number(item.value)}
                  </div>
                  <div css={small}>{item.detail}</div>
                </div>
              ))}
            </div>
            <EuiSpacer size="l" />
            <section
              data-test-subj="executiveBriefAssessment"
              css={[
                panel,
                css({
                  background: transparentize(euiTheme.colors.primary, 0.04),
                  borderTopColor: euiTheme.colors.primary,
                }),
              ]}
            >
              <div css={row}>
                <EuiIcon type="sparkles" color="primary" aria-hidden={true} />
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.brief.assessmentTitle',
                      { defaultMessage: 'Executive assessment' }
                    )}
                  </h2>
                </EuiTitle>
                {parsed && !isGenerating ? (
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.brief.aiAssessment',
                      { defaultMessage: 'AI interpretation' }
                    )}
                  </EuiBadge>
                ) : null}
              </div>
              <EuiSpacer size="m" />
              {isGenerating || isConnectorLoading ? (
                <div data-test-subj="entityIntelligenceExecutiveBriefLoading">
                  <EuiSkeletonText lines={3} />
                  <EuiText size="xs" color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.brief.generating',
                        {
                          defaultMessage:
                            'Connecting the evidence into a concise assessment. The captured facts are available below.',
                        }
                      )}
                    </p>
                  </EuiText>
                </div>
              ) : error || (result && !parsed) ? (
                <div role="alert" data-test-subj="entityIntelligenceExecutiveBriefError">
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.brief.generationFailed',
                        {
                          defaultMessage:
                            'The AI assessment could not be generated. The captured evidence remains available for review and export.',
                        }
                      )}
                    </p>
                  </EuiText>
                  <EuiButtonEmpty size="s" onClick={regenerate} iconType="refresh">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.brief.retry',
                      { defaultMessage: 'Try again' }
                    )}
                  </EuiButtonEmpty>
                </div>
              ) : parsed ? (
                <div
                  css={css({
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)',
                    gap: euiTheme.size.l,
                    '@media (max-width:700px)': { gridTemplateColumns: '1fr' },
                  })}
                >
                  <div>
                    <EuiText size="m">
                      <p>{parsed.narrative}</p>
                    </EuiText>
                    {parsed.businessImpact ? (
                      <>
                        <EuiSpacer size="s" />
                        <EuiText size="s" color="subdued">
                          <p>{parsed.businessImpact}</p>
                        </EuiText>
                      </>
                    ) : null}
                  </div>
                  <div>
                    <EuiText size="xs" color="subdued">
                      <strong>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.brief.decisions',
                          { defaultMessage: 'PRIORITY DECISIONS' }
                        )}
                      </strong>
                    </EuiText>
                    {parsed.decisions.map((decision, index) => (
                      <div
                        key={index}
                        css={css({
                          display: 'flex',
                          gap: euiTheme.size.s,
                          alignItems: 'flex-start',
                          paddingTop: euiTheme.size.m,
                        })}
                      >
                        <EuiBadge color="primary">{index + 1}</EuiBadge>
                        <EuiText size="s">
                          <p>{decision}</p>
                        </EuiText>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EuiText size="s" color="subdued">
                  <p data-test-subj="entityIntelligenceExecutiveBriefNoConnector">
                    {hasConnector
                      ? i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.brief.readyAssessment',
                          {
                            defaultMessage:
                              'The evidence snapshot is ready. Regenerate the brief to add a new assessment.',
                          }
                        )
                      : i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.brief.noConnector',
                          {
                            defaultMessage:
                              'The evidence snapshot is ready. Configure an AI connector to add an executive assessment.',
                          }
                        )}
                  </p>
                </EuiText>
              )}
              {generatedAt && connectorName && parsed && !isGenerating ? (
                <>
                  <EuiSpacer size="m" />
                  <div css={small}>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.brief.assessmentProvenance',
                      {
                        defaultMessage: 'Generated by {connector} · {timestamp}',
                        values: {
                          connector: connectorName,
                          timestamp: formatTimestamp(generatedAt),
                        },
                      }
                    )}
                  </div>
                </>
              ) : null}
            </section>
            <EuiSpacer size="l" />
            <ExecutiveBriefAgentEvidence
              agents={displayed.agents}
              onInvestigateAgent={onInvestigateAgent ? openAgent : undefined}
              onInvestigateCodex={onInvestigateCodex ? openCodex : undefined}
              onInvestigateCursor={onInvestigateCursor ? openCursor : undefined}
              onInvestigateClaudeDesktop={
                onInvestigateClaudeDesktop ? openClaudeDesktop : undefined
              }
              onInvestigateGoogleAdk={onInvestigateGoogleAdk ? openGoogleAdk : undefined}
            />
            <EuiSpacer size="l" />
            {displayed.data.topRisks.length ? (
              <section>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.brief.riskPriorities',
                      { defaultMessage: 'Identity risk priorities' }
                    )}
                  </h2>
                </EuiTitle>
                <EuiSpacer size="s" />
                <div
                  css={css({
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
                    gap: euiTheme.size.s,
                    '@media (max-width:700px)': { gridTemplateColumns: '1fr' },
                  })}
                >
                  {displayed.data.topRisks.slice(0, 3).map((entity) => (
                    <div key={entity.id} css={panel}>
                      <EuiText size="s">
                        <strong>{entity.name}</strong>
                      </EuiText>
                      <EuiButtonEmpty
                        size="xs"
                        flush="left"
                        iconType="inspect"
                        onClick={() => selectEntity(entity.id)}
                      >
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.brief.reviewIdentity',
                          { defaultMessage: 'Review identity' }
                        )}
                      </EuiButtonEmpty>
                    </div>
                  ))}
                </div>
                <EuiSpacer size="l" />
              </section>
            ) : null}
            <EuiAccordion
              id={`${titleId}-coverage`}
              buttonContent={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.coverageTitle',
                { defaultMessage: 'Evidence coverage and scope' }
              )}
              paddingSize="m"
              data-test-subj="executiveBriefCoverage"
            >
              <EuiText size="s">
                <ul>
                  {(Object.keys(displayed.coverage) as Array<keyof ExecutiveBriefCoverage>).map(
                    (key) => (
                      <li key={key}>
                        {briefCoverageSourceLabel(key)}
                        {': '}
                        {briefCoverageStatusLabel(displayed.coverage[key])}
                      </li>
                    )
                  )}
                  {displayed.agents.limitations.map((limit) => (
                    <li key={limit}>{briefLimitationLabel(limit)}</li>
                  ))}
                </ul>
              </EuiText>
            </EuiAccordion>
            <EuiSpacer size="s" />
            <EuiAccordion
              id={`${titleId}-risk-details`}
              buttonContent={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.detectionDetails',
                { defaultMessage: 'Entity risk and observed ATT&CK details' }
              )}
              paddingSize="m"
            >
              <ExecutiveBriefMetrics {...displayed.data} onSelectEntity={selectEntity} />
            </EuiAccordion>
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty size="s" onClick={onClose}>
          {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.close', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
        {displayed ? (
          <ExecutiveBriefExportButton
            payload={{
              brief: !isGenerating && !error ? parsed : undefined,
              ...displayed.data,
              agents: displayed.agents,
              coverage: displayed.coverage,
              capturedAtLabel,
              generatedAtLabel:
                generatedAt && parsed && !isGenerating && !error
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.brief.generatedAt',
                      {
                        defaultMessage: 'Assessment generated {timestamp}',
                        values: { timestamp: formatTimestamp(generatedAt) },
                      }
                    )
                  : capturedAtLabel,
              connectorName:
                !isGenerating && !error && parsed ? connectorName || undefined : undefined,
            }}
            onPopupBlocked={handlePopupBlocked}
          />
        ) : null}
        <EuiButton
          fill
          size="s"
          iconType="refresh"
          onClick={regenerate}
          disabled={sourcesLoading || agents.isRefreshing || isGenerating || isConnectorLoading}
          isLoading={isGenerating}
          data-test-subj="entityIntelligenceRegenerateExecutiveBrief"
        >
          {isGenerating
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.generatingButton',
                { defaultMessage: 'Generating assessment…' }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.refreshButton',
                { defaultMessage: 'Regenerate brief' }
              )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

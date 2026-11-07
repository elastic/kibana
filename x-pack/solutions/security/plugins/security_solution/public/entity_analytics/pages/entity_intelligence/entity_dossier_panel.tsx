/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../common/lib/kibana';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useEntityAnalyticsRoutes } from '../../api/api';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import { AssetCriticalityBadge } from '../../components/asset_criticality';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import type { IntelligenceEntity } from './common';
import { getRiskLevelColor } from './common';
import { IntelligencePanel, LoadingShimmer, RiskLevelBadge, SectionLabel } from './components';
import { RiskDial, RiskSparkline } from './risk_dial';
import { useConverseOnce } from './hooks/use_converse_api';
import { SecurityFindingsPanel } from './security_findings/security_findings_panel';
import { useSecurityFindings } from './security_findings/use_security_findings';
import type { SecurityFindingScope } from './security_findings/types';
import { useCountUp, dossierSlideIn } from './animations';
import { STRUCTURED_INSIGHT_FORMAT_INSTRUCTIONS } from './structured_insight';
import { StructuredInsightView } from './structured_insight_view';
import { EntityAgentActivity } from './entity_agent_activity';

const buildInsightPrompt = (entity: IntelligenceEntity): string =>
  [
    `You are a UEBA analyst. Assess the behavioral risk of this entity from our security entity store:`,
    `- Name: ${entity.name}`,
    `- Type: ${entity.type}`,
    `- Normalized risk score: ${entity.riskScoreNorm ?? 'unknown'} (level: ${entity.riskLevel})`,
    `- Asset criticality: ${entity.criticality ?? 'unassigned'}`,
    STRUCTURED_INSIGHT_FORMAT_INSTRUCTIONS,
  ].join('\n');

const buildHuntPrompt = (entity: IntelligenceEntity): string =>
  `Investigate the ${entity.type} entity "${entity.name}" (normalized risk score ${
    entity.riskScoreNorm ?? 'unknown'
  }, level ${
    entity.riskLevel
  }). Look for recent alerts, anomalies, and unusual behavior involving this entity, and summarize any threats found.`;

/**
 * In-page dossier: the primary detail surface for a selected entity. Replaces
 * the legacy entity details flyout with identity, risk, contributions, recent
 * alerts, AI insight, and hunt actions — all without leaving the page.
 */
export const EntityDossierPanel: React.FC<{
  entity: IntelligenceEntity;
  compact?: boolean;
  onShowAgentActivity?: () => void;
}> = ({ entity, compact = false, onShowAgentActivity }) => {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;
  const { fetchRiskScoreHistory } = useEntityAnalyticsRoutes();
  const spaceId = useSpaceId();
  const securityScope = useMemo<SecurityFindingScope>(() => ({ type: 'entity', entity }), [entity]);
  const securityFindings = useSecurityFindings(securityScope, spaceId);
  const findingsAccordionId = useGeneratedHtmlId({ prefix: 'entityDossierFindings' });
  const hasAgentFindings = securityFindings.findings.some(
    (finding) => finding.agent && finding.policy
  );

  const {
    data: history,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery(
    ['entityIntelligenceRiskHistory', spaceId, entity.type, entity.id],
    ({ signal }) =>
      fetchRiskScoreHistory({
        signal,
        params: {
          entityType: entity.type,
          entityId: entity.id,
          includeContributions: true,
        },
      }),
    {
      enabled: !compact || hasAgentFindings,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const { generate, result, isGenerating, error, reset, hasConnector } = useConverseOnce();

  // Clear any previous AI insight when switching entities.
  useEffect(() => {
    reset();
  }, [entity.id, reset]);

  const generateInsight = useCallback(() => {
    generate(buildInsightPrompt(entity));
  }, [generate, entity]);

  const huntInChat = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: buildHuntPrompt(entity),
      autoSendInitialMessage: false,
      sessionTag: 'security',
    });
  }, [agentBuilder, entity]);

  const animatedScore = useCountUp(entity.riskScoreNorm);

  const sparklineValues = useMemo(() => {
    const entries = history?.entries ?? [];
    return [...entries]
      .sort((a, b) => new Date(a['@timestamp']).getTime() - new Date(b['@timestamp']).getTime())
      .map((entry) => entry.calculated_score_norm);
  }, [history?.entries]);

  const topContributions = useMemo(() => {
    const entries = history?.entries ?? [];
    const latest = [...entries].sort(
      (a, b) => new Date(b['@timestamp']).getTime() - new Date(a['@timestamp']).getTime()
    )[0];
    return (latest?.inputs ?? [])
      .slice()
      .sort(
        (a, b) =>
          (b.contribution_score ?? b.risk_score ?? 0) - (a.contribution_score ?? a.risk_score ?? 0)
      )
      .slice(0, 5);
  }, [history?.entries]);

  const headerStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
  `;

  const nameStyle = css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const contributionRowStyle = css`
    display: flex;
    align-items: baseline;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.xs} 0;

    & + & {
      border-top: ${euiTheme.border.thin};
    }
  `;

  const contributionScoreStyle = css`
    margin-left: auto;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textParagraph};
  `;

  return (
    <div css={dossierSlideIn}>
      <IntelligencePanel
        accentColor={getRiskLevelColor(euiTheme, entity.riskLevel)}
        grow
        data-test-subj="entityIntelligenceDossier"
      >
        <div css={headerStyle}>
          <EuiIcon
            type={EntityIconByType[entity.type]}
            size="l"
            color="primary"
            aria-hidden={true}
          />
          <EuiTitle size="xs">
            <h3 css={nameStyle} title={entity.name}>
              {entity.name}
            </h3>
          </EuiTitle>
        </div>
        <EuiSpacer size="s" />
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.s};
          `}
        >
          <RiskLevelBadge level={entity.riskLevel} />
          {compact && entity.riskScoreNorm !== undefined && (
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.dossier.compactRiskScore',
                {
                  defaultMessage: 'Risk {score} / 100',
                  values: { score: entity.riskScoreNorm.toFixed(1) },
                }
              )}
            </EuiText>
          )}
          {entity.criticality && entity.criticality !== 'unassigned' ? (
            <AssetCriticalityBadge
              criticalityLevel={entity.criticality as CriticalityLevelWithUnassigned}
            />
          ) : null}
        </div>

        <EuiSpacer size="l" />
        <EntityAgentActivity
          key={entity.id}
          entity={entity}
          result={securityFindings}
          history={history}
          historyLoading={isHistoryLoading}
          compact={compact}
          onShowAgentActivity={onShowAgentActivity}
          onRefreshRisk={() => {
            void refetchHistory();
          }}
        />
        <EuiSpacer size="m" />
        {compact && hasAgentFindings ? (
          <EuiAccordion
            id={findingsAccordionId}
            buttonContent={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.dossier.findingEvidence',
              { defaultMessage: 'All security findings' }
            )}
            paddingSize="s"
          >
            <SecurityFindingsPanel
              compact
              scope={securityScope}
              result={securityFindings}
              entityTargets={[entity]}
            />
          </EuiAccordion>
        ) : (
          <SecurityFindingsPanel
            compact
            scope={securityScope}
            result={securityFindings}
            entityTargets={[entity]}
          />
        )}

        <EuiSpacer size="l" />
        {!compact && <RiskDial score={animatedScore} level={entity.riskLevel} />}

        {!compact ? (
          <>
            <EuiSpacer size="l" />
            <SectionLabel>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.dossier.riskHistoryTitle',
                { defaultMessage: 'Risk history (90 days)' }
              )}
            </SectionLabel>
            <EuiSpacer size="s" />
            {isHistoryLoading ? (
              <EuiSkeletonText lines={2} />
            ) : sparklineValues.length >= 2 ? (
              <RiskSparkline
                values={sparklineValues}
                color={getRiskLevelColor(euiTheme, entity.riskLevel)}
              />
            ) : (
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.dossier.noHistory',
                    { defaultMessage: 'Not enough scoring history to plot a trend yet.' }
                  )}
                </p>
              </EuiText>
            )}

            {topContributions.length > 0 ? (
              <>
                <EuiSpacer size="m" />
                <SectionLabel>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.dossier.contributionsTitle',
                    { defaultMessage: 'Top risk contributions' }
                  )}
                </SectionLabel>
                <EuiSpacer size="xs" />
                {topContributions.map((input) => (
                  <div key={JSON.stringify([input.index, input.id])} css={contributionRowStyle}>
                    <EuiText size="xs">
                      <span>{input.description}</span>
                    </EuiText>
                    <span css={contributionScoreStyle}>
                      {(input.contribution_score ?? input.risk_score ?? 0).toFixed(1)}
                    </span>
                  </div>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        <EuiSpacer size="l" />
        <SectionLabel>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.dossier.aiInsightTitle',
            { defaultMessage: 'AI insight' }
          )}
        </SectionLabel>
        <EuiSpacer size="s" />
        {isGenerating ? (
          <LoadingShimmer
            lines={3}
            label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.dossier.generatingInsight',
              { defaultMessage: 'Analyzing entity behavior…' }
            )}
          />
        ) : result ? (
          <StructuredInsightView content={result} />
        ) : error ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            size="s"
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.dossier.insightError',
              { defaultMessage: 'Insight generation failed' }
            )}
          >
            <p>{error}</p>
          </EuiCallOut>
        ) : (
          <EuiButton
            size="s"
            iconType="sparkles"
            onClick={generateInsight}
            disabled={!hasConnector}
            data-test-subj="entityIntelligenceGenerateInsight"
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.dossier.generateInsight',
              { defaultMessage: 'Generate AI insight' }
            )}
          </EuiButton>
        )}

        <EuiSpacer size="l" />
        <EuiButtonEmpty
          size="s"
          iconType="comment"
          onClick={huntInChat}
          data-test-subj="entityIntelligenceHuntEntity"
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.dossier.huntInChat',
            { defaultMessage: 'Hunt this entity in AI chat' }
          )}
        </EuiButtonEmpty>
      </IntelligencePanel>
    </div>
  );
};

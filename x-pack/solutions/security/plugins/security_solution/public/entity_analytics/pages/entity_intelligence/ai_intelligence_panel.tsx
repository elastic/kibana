/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useLicense } from '../../../common/hooks/use_license';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useHuntingLeads } from '../../components/threat_hunting/top_threat_hunting_leads/use_hunting_leads';
import type { HuntingLead } from '../../components/threat_hunting/top_threat_hunting_leads/types';
import type { EntityStoreStats } from './hooks/use_entity_store_stats';
import { useCompactAnomalies } from './hooks/use_compact_anomalies';
import { useConverseOnce } from './hooks/use_converse_api';
import { useDefaultAiConnector } from './hooks/use_default_ai_connector';
import { IntelligencePanel, LoadingShimmer, PanelEmptyState, SectionLabel } from './components';
import { STRUCTURED_INSIGHT_FORMAT_INSTRUCTIONS } from './structured_insight';
import { StructuredInsightView } from './structured_insight_view';

const THREAT_PATTERNS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.threatPatternsTitle',
  { defaultMessage: 'Threat patterns' }
);

const ANOMALIES_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.anomaliesTitle',
  { defaultMessage: 'Recent anomalies' }
);

const RUN_ANALYSIS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.runAnalysis',
  { defaultMessage: 'Run Full Analysis' }
);

const ANALYZING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.analyzing',
  { defaultMessage: 'Analyzing entity data…' }
);

const buildAnalysisPrompt = (stats: EntityStoreStats | undefined, leadsCount: number): string => {
  const typeSummary =
    stats?.byType
      .map(
        (typeStat) =>
          `${typeStat.type}: ${typeStat.count} entities, avg normalized risk ${
            typeStat.avgRisk !== undefined ? typeStat.avgRisk.toFixed(1) : 'unknown'
          }`
      )
      .join('; ') ?? 'no entity data';
  const levelSummary =
    stats?.byLevel.map((entry) => `${entry.type}/${entry.level}: ${entry.count}`).join('; ') ??
    'no risk level data';
  return [
    'You are a UEBA analyst. Assess the current security posture from the entity analytics snapshot below.',
    `Entity counts by type: ${typeSummary}.`,
    `Risk level distribution: ${levelSummary}.`,
    `Critical-risk entities: ${stats?.criticalCount ?? 0}. High-risk entities: ${
      stats?.highCount ?? 0
    }.`,
    `Open AI hunting leads: ${leadsCount}.`,
    STRUCTURED_INSIGHT_FORMAT_INSTRUCTIONS,
  ].join('\n');
};

const LeadCard: React.FC<{ lead: HuntingLead }> = ({ lead }) => {
  const { euiTheme } = useEuiTheme();
  const cardStyle = css`
    padding: ${euiTheme.size.m};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: linear-gradient(
      160deg,
      ${transparentize(euiTheme.colors.primary, 0.05)},
      transparent 60%
    );
  `;
  const titleStyle = css`
    display: flex;
    align-items: flex-start;
    gap: ${euiTheme.size.s};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textParagraph};
  `;
  const chipsStyle = css`
    display: flex;
    flex-wrap: wrap;
    gap: ${euiTheme.size.xs};
    margin-top: ${euiTheme.size.s};
  `;
  return (
    <div css={cardStyle}>
      <div css={titleStyle}>
        <EuiIcon type="bullseye" size="s" color="primary" aria-hidden={true} />
        <span>{lead.title}</span>
      </div>
      <div css={chipsStyle}>
        <EuiBadge color="hollow">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.leadPriority',
            { defaultMessage: 'Priority {priority}', values: { priority: lead.priority } }
          )}
        </EuiBadge>
        <EuiBadge color="hollow" iconType="user">
          {lead.entity.name}
        </EuiBadge>
      </div>
    </div>
  );
};

export const RecentAnomaliesPanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  const { anomalies, isLoading: isAnomaliesLoading } = useCompactAnomalies(spaceId);

  const anomalyRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s} 0;

    & + & {
      border-top: ${euiTheme.border.thin};
    }
  `;

  const anomalyScoreStyle = css`
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textParagraph};
  `;

  return (
    <IntelligencePanel grow data-test-subj="entityIntelligenceAnomaliesPanel">
      <SectionLabel>{ANOMALIES_TITLE}</SectionLabel>
      <EuiSpacer size="s" />
      {isAnomaliesLoading ? (
        <EuiSkeletonText lines={2} />
      ) : anomalies.length === 0 ? (
        <PanelEmptyState
          iconType="chartAnomaly"
          message={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.noAnomalies',
            { defaultMessage: 'No ML anomalies detected in the last 30 days.' }
          )}
        />
      ) : (
        <div>
          {anomalies.slice(0, 5).map((anomaly) => (
            <div key={anomaly.entityId} css={anomalyRowStyle}>
              <EuiIcon type="chartAnomaly" size="s" color="warning" aria-hidden={true} />
              <EuiText size="xs">
                <span>{anomaly.entityName}</span>
              </EuiText>
              <span css={anomalyScoreStyle}>{anomaly.maxScore}</span>
            </div>
          ))}
        </div>
      )}
    </IntelligencePanel>
  );
};

export const AiIntelligencePanel: React.FC<{
  stats: EntityStoreStats | undefined;
}> = ({ stats }) => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  const resolvedSpaceId = spaceId ?? 'default';

  const isEnterprise = useLicense().isEnterprise();
  const leadGenerationEnabled =
    useIsExperimentalFeatureEnabled('leadGenerationEnabled') && isEnterprise;

  const { connectorId } = useDefaultAiConnector();

  const { leads, isLoading: isLeadsLoading } = useHuntingLeads(
    connectorId,
    leadGenerationEnabled,
    resolvedSpaceId
  );

  const { generate, result, isGenerating, error, hasConnector } = useConverseOnce();

  const runAnalysis = useCallback(() => {
    generate(buildAnalysisPrompt(stats, leads.length));
  }, [generate, stats, leads.length]);

  const stackStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.m};
  `;

  return (
    <IntelligencePanel
      accentColor={euiTheme.colors.primary}
      grow
      data-test-subj="entityIntelligenceAiPanel"
    >
      <div css={stackStyle}>
        <div>
          <SectionLabel>{THREAT_PATTERNS_TITLE}</SectionLabel>
          <EuiSpacer size="s" />
          {isLeadsLoading ? (
            <EuiSkeletonText lines={2} />
          ) : leads.length === 0 ? (
            <PanelEmptyState
              iconType="bullseye"
              message={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.noLeads',
                { defaultMessage: 'No hunting leads generated yet.' }
              )}
            />
          ) : (
            <div css={stackStyle}>
              {leads.slice(0, 3).map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </div>

        <div>
          <EuiButton
            fill
            iconType="sparkles"
            size="s"
            fullWidth
            onClick={runAnalysis}
            isLoading={isGenerating}
            disabled={!hasConnector || isGenerating}
            data-test-subj="entityIntelligenceRunAnalysis"
          >
            {isGenerating ? ANALYZING : RUN_ANALYSIS}
          </EuiButton>
          {!hasConnector ? (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.noConnector',
                    {
                      defaultMessage: 'Configure an AI connector to enable live analysis.',
                    }
                  )}
                </p>
              </EuiText>
            </>
          ) : null}
          {isGenerating ? (
            <>
              <EuiSpacer size="m" />
              <LoadingShimmer lines={4} label={ANALYZING} />
            </>
          ) : null}
          {error && !isGenerating ? (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                color="danger"
                size="s"
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiPanel.analysisError',
                  { defaultMessage: 'Analysis failed' }
                )}
              >
                <p>{error}</p>
              </EuiCallOut>
            </>
          ) : null}
          {result && !isGenerating ? (
            <>
              <EuiSpacer size="m" />
              <StructuredInsightView content={result} />
            </>
          ) : null}
        </div>
      </div>
    </IntelligencePanel>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiIcon,
  EuiIconTip,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { HuntingLead } from '../../components/threat_hunting/top_threat_hunting_leads/types';
import type { IntelligenceEntity } from './common';
import type { CompactAnomaly } from './hooks/use_compact_anomalies';
import { staggeredEntrance } from './animations';

interface LeadSignal {
  id: string;
  kind: 'lead';
  urgency: number;
  title: string;
  detail: string;
  entity: IntelligenceEntity | undefined;
  lead: HuntingLead;
}

interface AnomalySignal {
  id: string;
  kind: 'anomaly';
  urgency: number;
  title: string;
  detail: string;
  entity: IntelligenceEntity | undefined;
  anomaly: CompactAnomaly;
}

type IntelligenceSignal = LeadSignal | AnomalySignal;

const findLeadEntity = (
  { entity: leadEntity }: HuntingLead,
  entities: readonly IntelligenceEntity[]
): IntelligenceEntity | undefined =>
  entities.find(
    (entity) =>
      entity.id === leadEntity.id ||
      (entity.name === leadEntity.name && entity.type === leadEntity.type.toLowerCase())
  );

const findAnomalyEntity = (
  anomaly: CompactAnomaly,
  entities: readonly IntelligenceEntity[]
): IntelligenceEntity | undefined =>
  entities.find(
    (entity) =>
      entity.id === anomaly.entityId ||
      (entity.name === anomaly.entityName && entity.type === anomaly.entityType.toLowerCase())
  );

const buildSignals = (
  leads: readonly HuntingLead[],
  anomalies: readonly CompactAnomaly[],
  entities: readonly IntelligenceEntity[]
): IntelligenceSignal[] => {
  const leadSignals: LeadSignal[] = leads.map((lead) => ({
    id: `lead:${lead.id}`,
    kind: 'lead',
    urgency: lead.priority * 10,
    title: lead.title,
    detail: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.leadPriorityDescription',
      {
        defaultMessage: 'Hunting lead · Priority {priority}/10',
        values: { priority: lead.priority },
      }
    ),
    entity: findLeadEntity(lead, entities),
    lead,
  }));
  const anomalySignals: AnomalySignal[] = anomalies.map((anomaly) => ({
    id: `anomaly:${anomaly.entityId}`,
    kind: 'anomaly',
    urgency: anomaly.maxScore,
    title: anomaly.entityName,
    detail: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.anomalyScoreDescription',
      {
        defaultMessage: 'ML anomaly · Score {score}',
        values: { score: anomaly.maxScore },
      }
    ),
    entity: findAnomalyEntity(anomaly, entities),
    anomaly,
  }));

  return [...leadSignals, ...anomalySignals]
    .sort(
      (left, right) =>
        right.urgency - left.urgency ||
        Number(left.kind === 'anomaly') - Number(right.kind === 'anomaly') ||
        left.title.localeCompare(right.title)
    )
    .slice(0, 5);
};

interface IntelligenceSignalsProps {
  entities: readonly IntelligenceEntity[];
  leads: readonly HuntingLead[];
  leadsCount: number;
  anomalies: readonly CompactAnomaly[];
  isLoading: boolean;
  isUnavailable?: boolean;
  onInvestigate: (entity: IntelligenceEntity) => void;
}

/**
 * The active hunting leads and recent ML anomalies for the Overview, ranked by
 * normalized urgency. The executive brief is no longer inline here — it lives in
 * its own modal launched from the Overview's top-right action — so this section
 * is purely the intelligence-signal list.
 */
export const IntelligenceSignals: React.FC<IntelligenceSignalsProps> = ({
  entities,
  leads,
  leadsCount,
  anomalies,
  isLoading,
  isUnavailable = false,
  onInvestigate,
}) => {
  const { euiTheme } = useEuiTheme();
  const signals = useMemo(
    () => buildSignals(leads, anomalies, entities),
    [anomalies, entities, leads]
  );

  const titleRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;
  const contentStyle = css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 0.32fr);
    gap: ${euiTheme.size.xl};
    margin-top: ${euiTheme.size.m};

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  `;
  const signalListStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: ${euiTheme.size.s} ${euiTheme.size.xl};
  `;
  const signalRowStyle = css`
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: ${euiTheme.size.m};
    min-width: 0;
    padding: ${euiTheme.size.s} 0;
    border-bottom: ${euiTheme.border.thin};
  `;
  const signalTitleStyle = css`
    overflow: hidden;
    color: ${euiTheme.colors.textHeading};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.medium};
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const signalDetailStyle = css`
    margin-top: 2px;
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
  `;
  const summaryStyle = css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${transparentize(euiTheme.colors.primary, 0.035)};
  `;
  const positiveStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    color: ${euiTheme.colors.textSubdued};
    font-size: ${euiTheme.size.m};
  `;

  return (
    <section css={staggeredEntrance(3)} data-test-subj="entityIntelligenceSignals">
      <div>
        <div css={titleRowStyle}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.title',
                { defaultMessage: 'Intelligence signals' }
              )}
            </h2>
          </EuiTitle>
          <EuiBadge color="hollow">
            {isUnavailable ? '—' : (leadsCount + anomalies.length).toLocaleString()}
          </EuiBadge>
          <EuiIconTip
            type="info"
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.rankingTooltip',
              {
                defaultMessage:
                  'Hunting lead priority is multiplied by 10 to compare its 1–10 scale with the 0–100 ML anomaly score. This affects ordering only.',
              }
            )}
          />
        </div>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.description',
              {
                defaultMessage:
                  'Active hunting leads and recent ML anomalies, ranked by normalized urgency.',
              }
            )}
          </p>
        </EuiText>
      </div>

      <div css={contentStyle}>
        {isLoading ? (
          <EuiSkeletonText lines={4} />
        ) : isUnavailable ? (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.unavailable',
                {
                  defaultMessage:
                    'Some intelligence sources are unavailable. Signal totals are withheld until access is restored.',
                }
              )}
            </p>
          </EuiText>
        ) : signals.length > 0 ? (
          <div css={signalListStyle}>
            {signals.map((signal) => (
              <div key={signal.id} css={signalRowStyle}>
                <EuiIcon
                  type={signal.kind === 'lead' ? 'bullseye' : 'chartAnomaly'}
                  color={
                    signal.urgency >= 75 ? 'danger' : signal.urgency >= 50 ? 'warning' : 'primary'
                  }
                  aria-hidden={true}
                />
                <div>
                  <div css={signalTitleStyle} title={signal.title}>
                    {signal.title}
                  </div>
                  <div css={signalDetailStyle}>{signal.detail}</div>
                </div>
                {signal.entity ? (
                  <EuiButtonEmpty
                    size="xs"
                    iconType="inspect"
                    onClick={() => signal.entity && onInvestigate(signal.entity)}
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.investigateEntityAriaLabel',
                      {
                        defaultMessage: 'Investigate {name}',
                        values: { name: signal.entity.name },
                      }
                    )}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.investigateButtonLabel',
                      { defaultMessage: 'Investigate' }
                    )}
                  </EuiButtonEmpty>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div css={positiveStyle}>
            <EuiIcon type="checkCircleFill" color="success" aria-hidden={true} />
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.clearDescription',
              { defaultMessage: 'No active intelligence signals require review.' }
            )}
          </div>
        )}

        {!isUnavailable && (
          <div css={summaryStyle}>
            <div css={positiveStyle}>
              <EuiIcon
                type={anomalies.length === 0 ? 'checkCircleFill' : 'chartAnomaly'}
                color={anomalies.length === 0 ? 'success' : 'warning'}
                aria-hidden={true}
              />
              <span>
                {anomalies.length === 0
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.noAnomaliesDescription',
                      { defaultMessage: 'No ML anomalies in 30 days' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.anomalyCountDescription',
                      {
                        defaultMessage:
                          '{count, plural, one {# ML anomaly in 30 days} other {# ML anomalies in 30 days}}',
                        values: { count: anomalies.length },
                      }
                    )}
              </span>
            </div>
            <div css={positiveStyle}>
              <EuiIcon
                type="bullseye"
                color={leadsCount > 0 ? 'primary' : 'subdued'}
                aria-hidden={true}
              />
              <span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.signals.leadCountDescription',
                  {
                    defaultMessage:
                      '{count, plural, =0 {No active hunting leads} one {# active hunting lead} other {# active hunting leads}}',
                    values: { count: leadsCount },
                  }
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

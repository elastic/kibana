/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { groupBy } from 'lodash';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiPaletteColorBlind,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import {
  buildAlertDetailsUrl,
  buildDiscoverEsqlUrl,
  buildEventLookupEsql,
  buildThreatReportLookupEsql,
} from '../navigation';
import { EntityChip } from '../entity_chip';
import { IocBadge, OPEN_ALERT_DETAILS_LABEL, discoverAction } from '../shared/ioc_badge';
import {
  Section,
  SectionStack,
  SectionHeading,
  DateTime,
  CompactStat,
  StatRow,
  HollowBadgeList,
  BadgeRow,
  InlineLabel,
  MetaCard,
  TableFrame,
  AttachmentEmptyState,
  buildMitreTechniqueUrl,
} from '../shared/primitives';
import { LabeledBadgeTable, type LabeledBadgeTableRow } from '../shared/labeled_badge_table';
import { formatPercent, SEVERITY_LEVELS, severityBadgeColor } from '../shared/severity';
import {
  buildSignificantSecurityEventActionButtons,
  parseSignificantSecurityEventData,
} from './view_model';
import type {
  HuntResult,
  MapsToProposal,
  SignificantSecurityAlertRef,
  SignificantSecurityEventAttachment,
  SignificantSecurityEventRef,
  SecurityKnowledgeIndicator,
  TimelineEntry,
} from './view_model';

export interface SignificantSecurityEventInlineContentProps
  extends AttachmentRenderProps<SignificantSecurityEventAttachment> {
  navigation: AttachmentNavigationDeps;
}

export const SSE_ATTACHMENT_TEST_ID = 'alertzeroSignificantSecurityEventAttachment';
export const SSE_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroSignificantSecurityEventAttachmentEmpty';
export const SSE_ATTACHMENT_HEADLINE_TEST_ID = 'alertzeroSignificantSecurityEventHeadline';

const EVIDENCE_BULLET_LIMIT = 5;

const TIER1_STATUS_LABELS: Record<HuntResult['tier1']['status'], string> = {
  no_searchable_terms: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.tier1NoSearchableTerms',
    { defaultMessage: 'No searchable terms' }
  ),
  no_environment_hits: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.tier1NoEnvironmentHits',
    { defaultMessage: 'No environment hits' }
  ),
  environment_hits_found: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.tier1EnvironmentHitsFound',
    { defaultMessage: 'Environment hits found' }
  ),
};

const TIER2_STATUS_LABELS: Record<NonNullable<HuntResult['tier2']>['status'], string> = {
  no_behaviors_found: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.tier2NoBehaviorsFound',
    { defaultMessage: 'No behaviors found' }
  ),
  no_behaviors_validated: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.tier2NoBehaviorsValidated',
    { defaultMessage: 'No behaviors validated' }
  ),
  behaviors_proposed: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.tier2BehaviorsProposed',
    { defaultMessage: 'Behaviors proposed' }
  ),
};

const INDICATOR_TYPE_LABELS: Record<SecurityKnowledgeIndicator['type'], string> = {
  technique: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsTechniques', {
    defaultMessage: 'Techniques',
  }),
  threat: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsThreat', {
    defaultMessage: 'Threat',
  }),
  technology: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsTechnology', {
    defaultMessage: 'Technology',
  }),
  risk: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsRisk', {
    defaultMessage: 'Risk',
  }),
  ioc: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsIoc', {
    defaultMessage: 'IOC',
  }),
};

const cellStyles = css`
  overflow-wrap: anywhere;
`;

const visColorPalette = euiPaletteColorBlind();

/** Cycles through the EUI color-blind-safe palette for distribution bar segments. */
const visColorAt = (index: number) => visColorPalette[index % visColorPalette.length];

/** `value` in the badge, confidence as a quieter suffix so the value itself stays scannable. */
const ConfidenceSuffix: React.FC<{ confidence?: number }> = ({ confidence }) => {
  const { euiTheme } = useEuiTheme();
  if (confidence == null) {
    return null;
  }
  return (
    <span
      css={css`
        color: ${euiTheme.colors.textSubdued};
        font-weight: ${euiTheme.font.weight.regular};
      `}
    >
      {' '}
      ({formatPercent(confidence)})
    </span>
  );
};

const EventRows: React.FC<{
  events: SignificantSecurityEventRef[];
  navigation: AttachmentNavigationDeps;
}> = ({ events, navigation }) => {
  const columns: Array<EuiBasicTableColumn<SignificantSecurityEventRef>> = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventWhen', {
        defaultMessage: 'When',
      }),
      width: '13em',
      render: (timestamp: string | undefined) =>
        timestamp ? (
          <EuiText size="xs" css={cellStyles}>
            <DateTime value={timestamp} />
          </EuiText>
        ) : null,
    },
    {
      field: 'event_id',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventId', {
        defaultMessage: 'Event id',
      }),
      render: (_eventId: string, event: SignificantSecurityEventRef) => {
        const esql = buildEventLookupEsql({
          index: event.source_index,
          eventId: event.event_id,
        });
        const href = buildDiscoverEsqlUrl({ share: navigation.share, esql });
        return (
          <IocBadge
            value={event.event_id}
            action={discoverAction(href)}
            testSubj={`alertzeroSignificantSecurityEventEventLink-${event.event_id}`}
          />
        );
      },
    },
    {
      field: 'source_index',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventIndex', {
        defaultMessage: 'Index',
      }),
      render: (index: string) => (
        <EuiText size="xs" color="subdued" css={cellStyles}>
          {index}
        </EuiText>
      ),
    },
    {
      field: 'matched',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventMatched', {
        defaultMessage: 'Matched on',
      }),
      render: (matched: SignificantSecurityEventRef['matched']) => {
        if (!matched) {
          return null;
        }
        const matchedValue = matched.ioc?.value ?? matched.technique_id;
        return (
          <EuiText size="xs" css={cellStyles}>
            {matchedValue ? <strong>{matchedValue}</strong> : null}
            {matchedValue ? ' ' : null}
            <span css={{ opacity: 0.8 }}>{matched.field}</span>
          </EuiText>
        );
      },
    },
  ];

  const sortedEvents = [...events].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return b.timestamp.localeCompare(a.timestamp);
  });

  return (
    <EuiInMemoryTable<SignificantSecurityEventRef>
      tableCaption={i18n.translate(
        'xpack.alertzero.agentBuilder.attachments.sse.eventsTableCaption',
        { defaultMessage: 'Significant security event related events' }
      )}
      items={sortedEvents}
      columns={columns}
      compressed
      tableLayout="auto"
      responsiveBreakpoint={false}
      pagination={
        sortedEvents.length > 5 ? { initialPageSize: 5, pageSizeOptions: [5, 10, 25] } : undefined
      }
    />
  );
};

const AlertList: React.FC<{
  alerts: SignificantSecurityAlertRef[];
  navigation: AttachmentNavigationDeps;
}> = ({ alerts, navigation }) => {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="alertzeroSignificantSecurityEventAlerts">
      <SectionHeading>
        <FormattedMessage
          id="xpack.alertzero.agentBuilder.attachments.sse.alertsHeading"
          defaultMessage="{count, plural, one {# alert} other {# alerts}}"
          values={{ count: alerts.length }}
        />
      </SectionHeading>
      <EuiSpacer size="s" />
      <BadgeRow>
        {alerts.map((alert) => {
          const href = buildAlertDetailsUrl({
            prependPath: navigation.prependPath,
            spaceId: navigation.spaceId,
            alertId: alert.alert_id,
            timestamp: alert.timestamp,
          });
          return (
            <IocBadge
              key={`${alert.index}:${alert.alert_id}`}
              value={alert.alert_id}
              action={{
                href,
                iconType: 'securitySignalDetected',
                label: OPEN_ALERT_DETAILS_LABEL,
              }}
              testSubj={`alertzeroSignificantSecurityEventAlertLink-${alert.alert_id}`}
            />
          );
        })}
      </BadgeRow>
    </div>
  );
};

const IndicatorList: React.FC<{
  indicators: SecurityKnowledgeIndicator[];
}> = ({ indicators }) => {
  if (indicators.length === 0) {
    return null;
  }

  const iocIndicators = indicators.filter((indicator) => indicator.type === 'ioc');
  const techniqueIndicators = indicators.filter((indicator) => indicator.type === 'technique');
  const otherIndicators = indicators.filter(
    (indicator) => indicator.type !== 'ioc' && indicator.type !== 'technique'
  );

  const iocsByType = groupBy(iocIndicators, (indicator) => indicator.ioc?.type ?? 'unknown');

  const rows: LabeledBadgeTableRow[] = Object.entries(iocsByType).map(([iocType, group]) => ({
    id: iocType,
    label: iocType,
    values: (
      <>
        {group.map((indicator, index) => (
          <IocBadge
            key={`${indicator.type}-${indicator.value}-${index}`}
            value={indicator.ioc?.value ?? indicator.value}
            index={index}
            testSubj={`alertzeroSignificantSecurityEventIndicator-ioc-${index}`}
          />
        ))}
      </>
    ),
  }));

  if (techniqueIndicators.length > 0) {
    rows.push({
      id: 'technique',
      label: INDICATOR_TYPE_LABELS.technique,
      values: (
        <>
          {techniqueIndicators.map((indicator, index) => {
            const mitreUrl = indicator.technique_id
              ? buildMitreTechniqueUrl(indicator.technique_id)
              : undefined;
            const linkProps = mitreUrl
              ? { href: mitreUrl, target: '_blank', rel: 'noopener noreferrer', iconType: 'popout' }
              : {};
            const showId =
              indicator.technique_id && !indicator.value.includes(indicator.technique_id);
            return (
              <EuiBadge
                key={`${indicator.type}-${indicator.value}-${index}`}
                color="hollow"
                iconSide="right"
                data-test-subj={`alertzeroSignificantSecurityEventIndicator-technique-${index}`}
                {...linkProps}
              >
                <span css={cellStyles}>
                  {showId ? <strong>{indicator.technique_id}</strong> : null}
                  {showId ? ' ' : null}
                  {indicator.value}
                  <ConfidenceSuffix confidence={indicator.confidence} />
                </span>
              </EuiBadge>
            );
          })}
        </>
      ),
    });
  }

  const otherByType = groupBy(otherIndicators, (indicator) => indicator.type);
  for (const [indicatorType, group] of Object.entries(otherByType)) {
    rows.push({
      id: indicatorType,
      label:
        INDICATOR_TYPE_LABELS[indicatorType as SecurityKnowledgeIndicator['type']] ?? indicatorType,
      values: (
        <>
          {group.map((indicator, index) => (
            <EuiBadge
              key={`${indicator.type}-${indicator.value}-${index}`}
              color="hollow"
              data-test-subj={`alertzeroSignificantSecurityEventIndicator-${indicator.type}-${index}`}
            >
              <span css={cellStyles}>
                {indicator.value}
                <ConfidenceSuffix confidence={indicator.confidence} />
              </span>
            </EuiBadge>
          ))}
        </>
      ),
    });
  }

  return (
    <Section
      testSubj="alertzeroSignificantSecurityEventIndicators"
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicators', {
        defaultMessage: 'Indicators',
      })}
      aside={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsCount', {
            defaultMessage: '{count, plural, one {# indicator} other {# indicators}}',
            values: { count: indicators.length },
          })}
        </EuiText>
      }
    >
      <LabeledBadgeTable
        rows={rows}
        caption={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsCaption', {
          defaultMessage: 'Indicators',
        })}
      />
    </Section>
  );
};

const EvidenceColumn: React.FC<{
  label: string;
  iconType: string;
  iconColor: string;
  items: string[];
}> = ({ label, iconType, iconColor, items }) => {
  const { euiTheme } = useEuiTheme();
  if (items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, EVIDENCE_BULLET_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} color={iconColor} size="s" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{label}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText
        size="s"
        css={css`
          margin-top: ${euiTheme.size.xs};
          ul {
            margin-bottom: 0;
            padding-left: ${euiTheme.size.base};
          }
          li {
            margin-bottom: ${euiTheme.size.xs};
          }
        `}
      >
        <ul>
          {visibleItems.map((item) => (
            <li key={item}>
              <span css={cellStyles}>{item}</span>
            </li>
          ))}
        </ul>
      </EuiText>
      {hiddenCount > 0 && (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj="alertzeroSignificantSecurityEventEvidenceOverflow"
        >
          <FormattedMessage
            id="xpack.alertzero.agentBuilder.attachments.sse.evidenceOverflow"
            defaultMessage="+{hiddenCount} more"
            values={{ hiddenCount }}
          />
        </EuiText>
      )}
    </EuiFlexItem>
  );
};

const HypothesisSection: React.FC<{ hypothesis: string }> = ({ hypothesis }) => (
  <Section
    title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.hypothesis', {
      defaultMessage: 'Hypothesis tested',
    })}
  >
    <EuiText size="s" data-test-subj="alertzeroSignificantSecurityEventHypothesis">
      <p css={[cellStyles, { margin: 0 }]}>{hypothesis}</p>
    </EuiText>
  </Section>
);

const TimelineSection: React.FC<{ timeline: TimelineEntry[] }> = ({ timeline }) => {
  const { euiTheme } = useEuiTheme();
  if (timeline.length === 0) {
    return null;
  }

  // Producer order is authoritative ("an ordered sequence"); do not re-sort lexically.
  const sorted = timeline;

  return (
    <Section
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timeline', {
        defaultMessage: 'Timeline',
      })}
      aside={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timelineCount', {
            defaultMessage: '{count, plural, one {# step} other {# steps}}',
            values: { count: timeline.length },
          })}
        </EuiText>
      }
    >
      <div
        data-test-subj="alertzeroSignificantSecurityEventTimeline"
        css={css`
          display: grid;
          grid-template-columns: max-content ${euiTheme.size.m} 1fr;
          column-gap: ${euiTheme.size.s};
          row-gap: 0;
        `}
      >
        {sorted.map((entry, index) => {
          const isLast = index === sorted.length - 1;
          return (
            <React.Fragment key={`${entry.at}-${index}`}>
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  font-variant-numeric: tabular-nums;
                  white-space: nowrap;
                  line-height: ${euiTheme.size.l};
                `}
              >
                <DateTime value={entry.at} />
              </EuiText>
              <div
                aria-hidden
                css={css`
                  position: relative;
                  &::before {
                    content: '';
                    position: absolute;
                    top: calc(${euiTheme.size.l} / 2 - 4px);
                    left: calc(50% - 4px);
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: ${euiTheme.colors.primary};
                  }
                  &::after {
                    content: '';
                    position: absolute;
                    top: calc(${euiTheme.size.l} / 2 + 4px);
                    bottom: ${isLast ? 'auto' : `-${euiTheme.size.xs}`};
                    left: calc(50% - 0.5px);
                    width: 1px;
                    background: ${isLast ? 'transparent' : euiTheme.colors.borderBaseSubdued};
                  }
                `}
              />
              <EuiText
                size="s"
                css={css`
                  ${cellStyles};
                  line-height: ${euiTheme.size.l};
                  padding-bottom: ${isLast ? 0 : euiTheme.size.s};
                `}
              >
                {entry.what}
              </EuiText>
            </React.Fragment>
          );
        })}
      </div>
    </Section>
  );
};

interface Tier2TableRow {
  technique_id: string;
  tactic_ids: string[];
  confidence: number;
  rule_name: string;
}

const HuntResultSection: React.FC<{ huntResult: HuntResult }> = ({ huntResult }) => {
  const { euiTheme } = useEuiTheme();
  const { tier1, tier2 } = huntResult;
  const isSampled = tier1.counts.returned_hits < tier1.counts.total_hits;
  const distributionStats = tier1.per_index.map((row, index) => ({
    key: row.index,
    count: row.hit_count,
    label: row.index,
    color: visColorAt(index),
  }));
  const totalDistributedHits = tier1.per_index.reduce((sum, row) => sum + row.hit_count, 0);

  // `resolved_iocs` are the concrete indicators that produced the hit counts above, so they
  // belong on the analyst-facing card and not only in the agent representation.
  const resolvedIocsByType = groupBy(tier1.resolved_iocs, (ioc) => ioc.type);
  const resolvedIocRows: LabeledBadgeTableRow[] = Object.entries(resolvedIocsByType).map(
    ([iocType, group]) => ({
      id: iocType,
      label: iocType,
      values: (
        <>
          {group.map((ioc, index) => (
            <IocBadge
              key={`${ioc.type}-${ioc.value}-${index}`}
              value={ioc.value}
              index={index}
              testSubj={`alertzeroSignificantSecurityEventHuntResultResolvedIoc-${iocType}-${index}`}
            />
          ))}
        </>
      ),
    })
  );

  const tier2Columns: Array<EuiBasicTableColumn<Tier2TableRow>> = [
    {
      field: 'technique_id',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTechnique', {
        defaultMessage: 'Technique',
      }),
      width: '10em',
      render: (techniqueId: string) => (
        <EuiBadge
          color="hollow"
          href={buildMitreTechniqueUrl(techniqueId)}
          target="_blank"
          rel="noopener noreferrer"
          iconType="external"
          iconSide="right"
          data-test-subj={`alertzeroSignificantSecurityEventHuntResultTechniqueLink-${techniqueId}`}
        >
          {techniqueId}
        </EuiBadge>
      ),
    },
    {
      field: 'rule_name',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultRule', {
        defaultMessage: 'Rule',
      }),
      render: (ruleName: string) => (
        <EuiText size="xs" css={cellStyles}>
          {ruleName}
        </EuiText>
      ),
    },
    {
      field: 'tactic_ids',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTactics', {
        defaultMessage: 'Tactics',
      }),
      width: '11em',
      render: (tacticIds: string[]) => <HollowBadgeList items={tacticIds} />,
    },
    {
      field: 'confidence',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultConfidence', {
        defaultMessage: 'Confidence',
      }),
      width: '9em',
      render: (confidence: number) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={{ minWidth: '3em' }}>
            <EuiText
              size="xs"
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
                font-variant-numeric: tabular-nums;
                text-align: right;
              `}
            >
              {formatPercent(confidence)}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiProgress size="xs" value={confidence} max={1} color="primary" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  const tier2Rows: Tier2TableRow[] =
    tier2?.behaviors.map((behavior) => ({
      technique_id: behavior.technique_id,
      tactic_ids: behavior.tactic_ids,
      confidence: behavior.confidence,
      rule_name: behavior.rule_name,
    })) ?? [];

  return (
    <Section
      testSubj="alertzeroSignificantSecurityEventHuntResult"
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTitle', {
        defaultMessage: 'Hunt result',
      })}
      aside={
        <EuiText size="xs" color="subdued" css={{ whiteSpace: 'nowrap' }}>
          <DateTime value={huntResult.time_range.from} />
          {' – '}
          <DateTime value={huntResult.time_range.to} />
        </EuiText>
      }
    >
      <div>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          wrap
          responsive={false}
          data-test-subj="alertzeroSignificantSecurityEventHuntResultOutcome"
        >
          <EuiFlexItem grow={false}>
            <EuiBadge color={huntResult.has_confirmed_hit ? 'danger' : 'hollow'}>
              {huntResult.has_confirmed_hit
                ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntConfirmedHit', {
                    defaultMessage: 'Confirmed hit',
                  })
                : i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.huntNoConfirmedHit',
                    { defaultMessage: 'No confirmed hit' }
                  )}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              <EuiText size="xs" color="subdued" component="span">
                {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.tier1Prefix', {
                  defaultMessage: 'Tier 1',
                })}
              </EuiText>{' '}
              {TIER1_STATUS_LABELS[tier1.status]}
            </EuiBadge>
          </EuiFlexItem>
          {tier2?.status && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                <EuiText size="xs" color="subdued" component="span">
                  {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.tier2Prefix', {
                    defaultMessage: 'Tier 2',
                  })}
                </EuiText>{' '}
                {TIER2_STATUS_LABELS[tier2.status]}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        <EuiPanel hasShadow={false} hasBorder paddingSize="m">
          <StatRow>
            <CompactStat
              emphasis="strong"
              title={
                isSampled
                  ? i18n.translate(
                      'xpack.alertzero.agentBuilder.attachments.sse.huntResultReturnedOfTotal',
                      {
                        defaultMessage: '{returned} of {total}',
                        values: {
                          returned: tier1.counts.returned_hits,
                          total: tier1.counts.total_hits,
                        },
                      }
                    )
                  : tier1.counts.total_hits
              }
              description={
                isSampled
                  ? i18n.translate(
                      'xpack.alertzero.agentBuilder.attachments.sse.huntResultHitsSampled',
                      { defaultMessage: 'Hits (sampled)' }
                    )
                  : i18n.translate(
                      'xpack.alertzero.agentBuilder.attachments.sse.huntResultTotalHits',
                      { defaultMessage: 'Total hits' }
                    )
              }
            />
            <CompactStat
              emphasis="strong"
              title={tier1.counts.affected_hosts}
              description={i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.sse.huntResultAffectedHosts',
                { defaultMessage: 'Affected hosts' }
              )}
            />
            <CompactStat
              emphasis="strong"
              title={tier1.counts.affected_users}
              description={i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.sse.huntResultAffectedUsers',
                { defaultMessage: 'Affected users' }
              )}
            />
            {tier2 && (
              <CompactStat
                emphasis="strong"
                title={tier2.behaviors.length}
                description={i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.sse.huntResultBehaviors',
                  { defaultMessage: 'Behaviors' }
                )}
              />
            )}
          </StatRow>

          {distributionStats.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <DistributionBar
                stats={distributionStats}
                hideLastTooltip
                data-test-subj="alertzeroSignificantSecurityEventHuntResultDistributionBar"
              />
              <EuiSpacer size="xs" />
              <EuiFlexGroup
                gutterSize="m"
                wrap
                responsive={false}
                alignItems="center"
                justifyContent="spaceBetween"
              >
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="m" wrap responsive={false}>
                    {distributionStats.map((stat) => (
                      <EuiFlexItem grow={false} key={stat.key}>
                        <EuiHealth color={stat.color} textSize="xs">
                          {stat.label} ({stat.count})
                        </EuiHealth>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.alertzero.agentBuilder.attachments.sse.huntResultDistributionSummary"
                      defaultMessage="{hits, plural, one {# event} other {# events}} across {indices, plural, one {# index} other {# indices}}"
                      values={{ hits: totalDistributedHits, indices: tier1.per_index.length }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>

        {resolvedIocRows.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <Section
              title={i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.sse.huntResultResolvedIocs',
                { defaultMessage: 'Resolved IOCs' }
              )}
            >
              <LabeledBadgeTable
                rows={resolvedIocRows}
                testSubj="alertzeroSignificantSecurityEventHuntResultResolvedIocs"
                caption={i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.sse.huntResultResolvedIocsTableCaption',
                  { defaultMessage: 'Resolved IOCs for the hunt result' }
                )}
              />
            </Section>
          </>
        )}

        {tier2Rows.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <Section
              title={i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.sse.huntResultBehaviorsTitle',
                { defaultMessage: 'Validated behaviors' }
              )}
            >
              <TableFrame>
                <EuiBasicTable<Tier2TableRow>
                  tableLayout="fixed"
                  responsiveBreakpoint={false}
                  rowHeader="technique_id"
                  tableCaption={i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.huntResultBehaviorsTableCaption',
                    { defaultMessage: 'Hunt result behaviors' }
                  )}
                  items={tier2Rows}
                  columns={tier2Columns}
                />
              </TableFrame>
            </Section>
          </>
        )}
      </div>
    </Section>
  );
};

const isSeverityLevel = (value: string): value is (typeof SEVERITY_LEVELS)[number] =>
  (SEVERITY_LEVELS as readonly string[]).includes(value);

const ProposalSection: React.FC<{ proposal: MapsToProposal }> = ({ proposal }) => {
  const { euiTheme } = useEuiTheme();
  const {
    category,
    impact,
    confidence,
    actionWorkflowId,
    actionInput,
    manual_remediation: manualSteps,
  } = proposal;

  const actionInputEntries = Object.entries(actionInput ?? {});

  if (
    !category &&
    !impact &&
    confidence == null &&
    !actionWorkflowId &&
    !actionInputEntries.length &&
    !manualSteps?.length
  ) {
    return null;
  }

  const listStyles = css`
    ul {
      margin-bottom: 0;
      padding-left: ${euiTheme.size.base};
    }
    li {
      margin-bottom: ${euiTheme.size.xs};
    }
  `;

  const hasHeaderRow = Boolean(category || confidence != null || impact);

  return (
    <Section
      testSubj="alertzeroSignificantSecurityEventProposal"
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.proposal', {
        defaultMessage: 'Proposal',
      })}
      aside={
        actionWorkflowId ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <InlineLabel>
                {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.proposalWorkflow', {
                  defaultMessage: 'Action workflow:',
                })}
              </InlineLabel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <IocBadge value={actionWorkflowId} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : undefined
      }
    >
      <EuiPanel hasShadow={false} hasBorder paddingSize="m">
        {hasHeaderRow && (
          <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
            {category && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary" css={{ textTransform: 'capitalize' }}>
                  {category}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {impact && isSeverityLevel(impact) && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={severityBadgeColor(impact)}>
                  {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.proposalImpact', {
                    defaultMessage: '{impact} impact',
                    values: { impact },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {confidence != null && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.proposalConfidence',
                    {
                      defaultMessage: '{confidence} confidence',
                      values: { confidence: formatPercent(confidence) },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
        {impact && !isSeverityLevel(impact) && (
          <>
            {hasHeaderRow && <EuiSpacer size="s" />}
            <EuiText size="s">
              <span css={cellStyles}>{impact}</span>
            </EuiText>
          </>
        )}
        {(actionInputEntries.length > 0 || (manualSteps && manualSteps.length > 0)) && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
              {actionInputEntries.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate(
                        'xpack.alertzero.agentBuilder.attachments.sse.proposalActionInput',
                        { defaultMessage: 'Action input' }
                      )}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" css={listStyles}>
                    <ul>
                      {actionInputEntries.map(([key, value]) => (
                        <li key={key}>
                          <span css={cellStyles}>
                            {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </EuiText>
                </EuiFlexItem>
              )}
              {manualSteps && manualSteps.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate(
                        'xpack.alertzero.agentBuilder.attachments.sse.proposalManualRemediation',
                        { defaultMessage: 'Manual remediation' }
                      )}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" css={listStyles}>
                    <ul>
                      {manualSteps.map((step) => (
                        <li key={step}>
                          <span css={cellStyles}>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
    </Section>
  );
};

export const SignificantSecurityEventInlineContent: React.FC<
  SignificantSecurityEventInlineContentProps
> = ({ attachment, navigation }) => {
  const parsed = parseSignificantSecurityEventData(attachment?.data);

  if (!parsed) {
    return (
      <AttachmentEmptyState
        testSubj={SSE_ATTACHMENT_EMPTY_TEST_ID}
        message={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.empty', {
          defaultMessage: 'No significant security event data available',
        })}
      />
    );
  }

  const events = parsed.events ?? [];
  const alerts = parsed.alerts ?? [];
  const hasEvents = events.length > 0;
  const eventIndexCount = new Set(events.map((event) => event.source_index)).size;

  const hasChromeHeader =
    buildSignificantSecurityEventActionButtons({ parsed, navigation }).length > 0;

  const hasEvidence = parsed.evidence_for.length > 0 || parsed.evidence_against.length > 0;

  const statusRow = (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      wrap
      responsive={false}
      data-test-subj="alertzeroSignificantSecurityEventStatusRow"
    >
      <EuiFlexItem grow={false}>
        <EuiBadge color={severityBadgeColor(parsed.severity)}>{parsed.severity}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{parsed.status}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.confidence', {
            defaultMessage: '{confidence} confidence',
            values: { confidence: formatPercent(parsed.confidence) },
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
      data-test-subj={SSE_ATTACHMENT_TEST_ID}
    >
      <SectionStack>
        {/* Title defers to the chrome header when one renders; severity / status / confidence
            are body content and always show (the header no longer carries badges). */}
        {hasChromeHeader ? (
          statusRow
        ) : (
          <div data-test-subj={SSE_ATTACHMENT_HEADLINE_TEST_ID}>
            <EuiTitle size="xs">
              <h3 css={cellStyles}>{parsed.title}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            {statusRow}
          </div>
        )}

        {parsed.truncated && (
          <KbnInfoCallout
            announceOnMount
            size="s"
            data-test-subj="alertzeroSignificantSecurityEventTruncation"
            title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.truncatedTitle', {
              defaultMessage: 'Payload truncated',
            })}
            text={
              parsed.truncated_original_count != null
                ? i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.truncatedWithCount',
                    {
                      defaultMessage:
                        'This attachment was truncated. Original count: {originalCount}.',
                      values: { originalCount: parsed.truncated_original_count },
                    }
                  )
                : i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.truncated', {
                    defaultMessage: 'This attachment was truncated.',
                  })
            }
          />
        )}

        {(parsed.run_id || parsed.report_id) && (
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {parsed.run_id && (
              <EuiFlexItem css={{ minWidth: 200 }}>
                <MetaCard
                  label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.runId', {
                    defaultMessage: 'Run id',
                  })}
                >
                  <IocBadge
                    value={parsed.run_id}
                    testSubj="alertzeroSignificantSecurityEventRunId"
                  />
                </MetaCard>
              </EuiFlexItem>
            )}
            {parsed.report_id && (
              <EuiFlexItem css={{ minWidth: 200 }}>
                <MetaCard
                  label={i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.sourceReport',
                    { defaultMessage: 'Source report' }
                  )}
                >
                  <IocBadge
                    value={parsed.report_id}
                    action={discoverAction(
                      buildDiscoverEsqlUrl({
                        share: navigation.share,
                        esql: buildThreatReportLookupEsql({
                          reportId: parsed.report_id,
                          spaceId: navigation.spaceId,
                        }),
                      })
                    )}
                    testSubj="alertzeroSignificantSecurityEventReportLink"
                  />
                </MetaCard>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}

        {parsed.hypothesis_tested && <HypothesisSection hypothesis={parsed.hypothesis_tested} />}

        {parsed.hunt_result && <HuntResultSection huntResult={parsed.hunt_result} />}

        {hasEvidence && (
          <Section
            title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidence', {
              defaultMessage: 'Evidence',
            })}
          >
            <EuiPanel hasShadow={false} hasBorder paddingSize="m">
              <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                <EvidenceColumn
                  label={i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.evidenceFor',
                    {
                      defaultMessage: 'Evidence for',
                    }
                  )}
                  iconType="check"
                  iconColor="success"
                  items={parsed.evidence_for}
                />
                <EvidenceColumn
                  label={i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.evidenceAgainst',
                    { defaultMessage: 'Evidence against' }
                  )}
                  iconType="cross"
                  iconColor="danger"
                  items={parsed.evidence_against}
                />
              </EuiFlexGroup>
            </EuiPanel>
          </Section>
        )}

        {parsed.maps_to_proposal && <ProposalSection proposal={parsed.maps_to_proposal} />}

        {parsed.timeline.length > 0 && <TimelineSection timeline={parsed.timeline} />}

        {alerts.length > 0 && <AlertList alerts={alerts} navigation={navigation} />}

        {hasEvents && (
          <Section
            title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventsTitle', {
              defaultMessage: 'Events',
            })}
            aside={
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.alertzero.agentBuilder.attachments.sse.eventsAside"
                  defaultMessage="{count, plural, one {# event} other {# events}} across {indices, plural, one {# index} other {# indices}}"
                  values={{ count: events.length, indices: eventIndexCount }}
                />
              </EuiText>
            }
          >
            <TableFrame>
              <EuiAccordion
                id={`alertzeroSignificantSecurityEventEvents-${attachment.id}`}
                initialIsOpen={false}
                arrowDisplay="right"
                paddingSize="s"
                data-test-subj="alertzeroSignificantSecurityEventEventsAccordion"
                buttonProps={{ paddingSize: 's' }}
                buttonContent={
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="documents" color="subdued" size="m" aria-hidden />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxs">
                        <h4>
                          <FormattedMessage
                            id="xpack.alertzero.agentBuilder.attachments.sse.eventsAccordionButton"
                            defaultMessage="{count, plural, one {# event} other {# events}}"
                            values={{ count: events.length }}
                          />
                        </h4>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                extraAction={
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventsHint', {
                      defaultMessage: 'Event ids, source indices and matched fields',
                    })}
                  </EuiText>
                }
              >
                <EventRows events={events} navigation={navigation} />
              </EuiAccordion>
            </TableFrame>
          </Section>
        )}

        {parsed.security_knowledge_indicators.length > 0 && (
          <IndicatorList indicators={parsed.security_knowledge_indicators} />
        )}

        {parsed.entities.length > 0 && (
          <Section
            title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entities', {
              defaultMessage: 'Entities',
            })}
            aside={
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entitiesCount', {
                  defaultMessage: '{count, plural, one {# entity} other {# entities}}',
                  values: { count: parsed.entities.length },
                })}
              </EuiText>
            }
          >
            <BadgeRow>
              {parsed.entities.map((entity, index) => (
                <EntityChip
                  key={`${entity.field}:${entity.value}:${index}`}
                  entity={entity}
                  share={navigation.share}
                  getUrlForApp={navigation.getUrlForApp}
                  testSubj={`alertzeroSignificantSecurityEventEntity-${index}`}
                />
              ))}
            </BadgeRow>
          </Section>
        )}
      </SectionStack>
    </EuiPanel>
  );
};

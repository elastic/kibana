/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadgeGroup,
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
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
import { IocBadge } from '../shared/ioc_badge';
import { LabeledBadgeTable } from '../shared/labeled_badge_table';
import { formatConfidencePercent } from '../shared/severity';
import { buildMitreTechniqueUrl } from '../shared/mitre_url';
import { parseSignificantSecurityEventData } from './types';
import type {
  ParsedHuntResult,
  SignificantSecurityAlertRef,
  SignificantSecurityEventAttachment,
  SignificantSecurityEventRef,
  SecurityKnowledgeIndicator,
  TimelineEntry,
} from './types';

export interface SignificantSecurityEventInlineContentProps
  extends AttachmentRenderProps<SignificantSecurityEventAttachment> {
  navigation: AttachmentNavigationDeps;
}

export const SSE_ATTACHMENT_TEST_ID = 'alertzeroSignificantSecurityEventAttachment';
export const SSE_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroSignificantSecurityEventAttachmentEmpty';

const HYPOTHESIS_ACCORDION_THRESHOLD = 160;
const EVIDENCE_BULLET_LIMIT = 5;

const cellStyles = css`
  overflow-wrap: anywhere;
`;

const paginationListStyles = css`
  .euiPagination__list {
    list-style: none;
    margin: 0;
  }
`;

const VIS_COLOR_COUNT = 10;

/** Cycles through `euiTheme.colors.vis.euiColorVis0..9` for distribution bar segments. */
const useVisColorCycle = () => {
  const { euiTheme } = useEuiTheme();
  const visColors = euiTheme.colors.vis as unknown as Record<string, string>;
  return (index: number) => visColors[`euiColorVis${index % VIS_COLOR_COUNT}`];
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
      width: '12em',
      render: (timestamp: string | undefined) =>
        timestamp ? (
          <span css={cellStyles}>
            <FormattedDate value={timestamp} year="numeric" month="short" day="2-digit" />{' '}
            <FormattedTime value={timestamp} />
          </span>
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
            index={0}
            discoverHref={href}
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
      render: (index: string) => <span css={cellStyles}>{index}</span>,
    },
  ];

  const sortedEvents = [...events].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return b.timestamp.localeCompare(a.timestamp);
  });

  return (
    <EuiInMemoryTable<SignificantSecurityEventRef>
      css={paginationListStyles}
      tableCaption={i18n.translate(
        'xpack.alertzero.agentBuilder.attachments.sse.eventsTableCaption',
        { defaultMessage: 'Significant security event related events' }
      )}
      items={sortedEvents}
      columns={columns}
      compressed
      pagination={{ initialPageSize: 5, pageSizeOptions: [5, 10, 25] }}
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
    <EuiText size="s">
      <ul>
        {alerts.map((alert) => {
          const href = buildAlertDetailsUrl({
            prependPath: navigation.prependPath,
            spaceId: navigation.spaceId,
            alertId: alert.alert_id,
            index: alert.index,
            timestamp: alert.timestamp,
          });
          return (
            <li key={`${alert.index}:${alert.alert_id}`}>
              <IocBadge
                value={alert.alert_id}
                index={0}
                alertDetailsHref={href}
                testSubj={`alertzeroSignificantSecurityEventAlertLink-${alert.alert_id}`}
              />
            </li>
          );
        })}
      </ul>
    </EuiText>
  );
};

/**
 * Taxonomy labels only, per `significant_security_event_schema.ts`: not
 * Discover IOCs, so this never links into `logs-*` (do not invent field
 * mappings from `type`). Split by type instead of one flat bulleted list:
 * `ioc` and `technique` are what the hunt coordinator actually emits today
 * (`sse_mapper.ts`'s `buildSecurityKnowledgeIndicators`), and each has a
 * distinct shape worth a distinct treatment. The IOC bucket renders as a
 * `LabeledBadgeTable` (one row per IOC type) to match the Threat Report
 * design; techniques and the fallback bucket keep their prior list/badge
 * rendering since neither maps cleanly onto that two-column shape (a
 * documented deviation from the "match Threat Report" instruction).
 */
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

  const iocsByType = new Map<string, SecurityKnowledgeIndicator[]>();
  for (const indicator of iocIndicators) {
    const iocType = indicator.ioc?.type ?? 'unknown';
    const bucket = iocsByType.get(iocType) ?? [];
    bucket.push(indicator);
    iocsByType.set(iocType, bucket);
  }

  const iocRows = [...iocsByType.entries()].map(([iocType, group]) => ({
    id: iocType,
    label: iocType,
    values: (
      <>
        {group.map((indicator, index) => (
          <IocBadge
            key={`${indicator.type}-${indicator.value}-${index}`}
            value={indicator.value}
            index={index}
            testSubj={`alertzeroSignificantSecurityEventIndicator-ioc-${index}`}
          />
        ))}
      </>
    ),
  }));

  return (
    <>
      {iocIndicators.length > 0 && (
        <div data-test-subj="alertzeroSignificantSecurityEventIndicatorIocs">
          <LabeledBadgeTable
            rows={iocRows}
            caption={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsIocs', {
              defaultMessage: 'IOCs',
            })}
          />
        </div>
      )}

      {techniqueIndicators.length > 0 && (
        <div
          data-test-subj="alertzeroSignificantSecurityEventIndicatorTechniques"
          css={{ marginTop: 8, marginBottom: 8 }}
        >
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsTechniques', {
              defaultMessage: 'Techniques',
            })}
          </EuiText>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            {techniqueIndicators.map((indicator, index) => {
              const mitreUrl = indicator.technique_id
                ? buildMitreTechniqueUrl(indicator.technique_id)
                : undefined;
              const badge = (
                <EuiBadge
                  color="hollow"
                  data-test-subj={`alertzeroSignificantSecurityEventIndicator-technique-${index}`}
                >
                  <span css={cellStyles}>
                    {indicator.value}
                    {indicator.confidence != null
                      ? ` (${formatConfidencePercent(indicator.confidence)})`
                      : ''}
                  </span>
                </EuiBadge>
              );
              return (
                <EuiFlexItem grow={false} key={`${indicator.type}-${indicator.value}-${index}`}>
                  {mitreUrl ? (
                    <a
                      href={mitreUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-test-subj={`alertzeroSignificantSecurityEventIndicatorMitreLink-${index}`}
                    >
                      {badge}
                    </a>
                  ) : (
                    badge
                  )}
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </div>
      )}

      {otherIndicators.length > 0 && (
        <EuiText size="s">
          <ul>
            {otherIndicators.map((indicator, index) => (
              <li
                key={`${indicator.type}-${indicator.value}-${index}`}
                data-test-subj={`alertzeroSignificantSecurityEventIndicator-${indicator.type}-${index}`}
              >
                <span css={cellStyles}>
                  {indicator.type}: {indicator.value}
                  {indicator.confidence != null
                    ? ` (${formatConfidencePercent(indicator.confidence)})`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </EuiText>
      )}
    </>
  );
};

const EvidenceSection: React.FC<{
  label: string;
  items: string[];
}> = ({ label, items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
      <EuiText size="s">
        <ul>
          {items.slice(0, EVIDENCE_BULLET_LIMIT).map((item) => (
            <li key={item}>
              <span css={cellStyles}>{item}</span>
            </li>
          ))}
        </ul>
      </EuiText>
    </>
  );
};

const HypothesisSection: React.FC<{ hypothesis: string }> = ({ hypothesis }) => {
  const title = i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.hypothesis', {
    defaultMessage: 'Hypothesis tested',
  });

  if (hypothesis.length > HYPOTHESIS_ACCORDION_THRESHOLD) {
    return (
      <EuiAccordion
        id="alertzeroSignificantSecurityEventHypothesis"
        buttonContent={title}
        initialIsOpen={false}
        data-test-subj="alertzeroSignificantSecurityEventHypothesisAccordion"
      >
        <EuiText size="s">
          <p css={cellStyles}>{hypothesis}</p>
        </EuiText>
      </EuiAccordion>
    );
  }

  return (
    <EuiText size="s">
      <strong>{title}</strong>
      <p css={cellStyles}>{hypothesis}</p>
    </EuiText>
  );
};

const TimelineSection: React.FC<{ timeline: TimelineEntry[] }> = ({ timeline }) => {
  if (timeline.length === 0) {
    return null;
  }

  return (
    <>
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timeline', {
            defaultMessage: 'Timeline',
          })}
        </strong>
      </EuiText>
      <EuiTimeline data-test-subj="alertzeroSignificantSecurityEventTimeline">
        {timeline.map((entry, index) => (
          <EuiTimelineItem icon="clock" verticalAlign="top" key={`${entry.at}-${index}`}>
            <EuiText size="xs" color="subdued">
              <p css={{ margin: 0 }}>
                <FormattedDate value={entry.at} year="numeric" month="short" day="2-digit" />{' '}
                <FormattedTime value={entry.at} />
              </p>
            </EuiText>
            <EuiText size="s">
              <p css={cellStyles}>{entry.what}</p>
            </EuiText>
          </EuiTimelineItem>
        ))}
      </EuiTimeline>
    </>
  );
};

interface Tier2TableRow {
  techniqueId: string;
  tacticIds: string[];
  confidence: number;
  ruleName: string;
}

const HuntResultSection: React.FC<{ huntResult: ParsedHuntResult }> = ({ huntResult }) => {
  const visColorAt = useVisColorCycle();
  const { tier1, tier2 } = huntResult;
  const distributionStats = tier1.perIndex.map((row, index) => ({
    key: row.index,
    count: row.hitCount,
    label: row.index,
    color: visColorAt(index),
  }));
  const totalDistributedHits = tier1.perIndex.reduce((sum, row) => sum + row.hitCount, 0);

  const tier2Columns: Array<EuiBasicTableColumn<Tier2TableRow>> = [
    {
      field: 'techniqueId',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTechnique', {
        defaultMessage: 'Technique',
      }),
      render: (techniqueId: string) => (
        <a
          href={buildMitreTechniqueUrl(techniqueId)}
          target="_blank"
          rel="noreferrer"
          data-test-subj={`alertzeroSignificantSecurityEventHuntResultTechniqueLink-${techniqueId}`}
        >
          <EuiBadge color="hollow">{techniqueId}</EuiBadge>
        </a>
      ),
    },
    {
      field: 'ruleName',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultRule', {
        defaultMessage: 'Rule',
      }),
      render: (ruleName: string) => <span css={cellStyles}>{ruleName}</span>,
    },
    {
      field: 'tacticIds',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTactics', {
        defaultMessage: 'Tactics',
      }),
      render: (tacticIds: string[]) => (
        <EuiBadgeGroup gutterSize="xs">
          {tacticIds.map((tacticId) => (
            <EuiBadge color="hollow" key={tacticId}>
              {tacticId}
            </EuiBadge>
          ))}
        </EuiBadgeGroup>
      ),
    },
    {
      field: 'confidence',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultConfidence', {
        defaultMessage: 'Confidence',
      }),
      render: (confidence: number) => (
        <EuiProgress
          size="s"
          value={confidence}
          max={1}
          valueText={formatConfidencePercent(confidence)}
        />
      ),
    },
  ];

  const tier2Rows: Tier2TableRow[] =
    tier2?.behaviors.map((behavior) => ({
      techniqueId: behavior.techniqueId,
      tacticIds: behavior.tacticIds,
      confidence: behavior.confidence,
      ruleName: behavior.ruleName,
    })) ?? [];

  return (
    <div data-test-subj="alertzeroSignificantSecurityEventHuntResult">
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTitle', {
            defaultMessage: 'Hunt result',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="l" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="xs"
            reverse
            title={tier1.counts.totalHits}
            description={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.huntResultTotalHits',
              { defaultMessage: 'Total hits' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="xs"
            reverse
            title={tier1.counts.affectedHosts}
            description={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.huntResultAffectedHosts',
              { defaultMessage: 'Affected hosts' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="xs"
            reverse
            title={tier1.counts.affectedUsers}
            description={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.huntResultAffectedUsers',
              { defaultMessage: 'Affected users' }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        <FormattedDate
          value={huntResult.timeRange.from}
          year="numeric"
          month="short"
          day="2-digit"
        />{' '}
        <FormattedTime value={huntResult.timeRange.from} />
        {' - '}
        <FormattedDate
          value={huntResult.timeRange.to}
          year="numeric"
          month="short"
          day="2-digit"
        />{' '}
        <FormattedTime value={huntResult.timeRange.to} />
      </EuiText>

      {distributionStats.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <DistributionBar
            stats={distributionStats}
            data-test-subj="alertzeroSignificantSecurityEventHuntResultDistributionBar"
          />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertzero.agentBuilder.attachments.sse.huntResultDistributionSummary"
              defaultMessage="{hits, plural, one {# event} other {# events}} across {indices, plural, one {# index} other {# indices}}"
              values={{ hits: totalDistributedHits, indices: tier1.perIndex.length }}
            />
          </EuiText>
        </>
      )}

      {tier2Rows.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiBasicTable<Tier2TableRow>
            compressed
            tableCaption={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.huntResultBehaviorsTableCaption',
              { defaultMessage: 'Hunt result behaviors' }
            )}
            items={tier2Rows}
            columns={tier2Columns}
          />
        </>
      )}
    </div>
  );
};

export const SignificantSecurityEventInlineContent: React.FC<
  SignificantSecurityEventInlineContentProps
> = ({ attachment, navigation }) => {
  const parsed = parseSignificantSecurityEventData(attachment?.data);

  if (!parsed) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj={SSE_ATTACHMENT_EMPTY_TEST_ID}
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.empty', {
            defaultMessage: 'No significant security event data available',
          })}
        </EuiText>
      </EuiPanel>
    );
  }

  const hasEventsOrAlerts = parsed.events.length > 0 || parsed.alerts.length > 0;

  return (
    <EuiPanel hasBorder={false} paddingSize="s" data-test-subj={SSE_ATTACHMENT_TEST_ID}>
      {parsed.truncated && (
        <>
          <KbnInfoCallout
            announceOnMount
            size="s"
            data-test-subj="alertzeroSignificantSecurityEventTruncation"
            title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.truncatedTitle', {
              defaultMessage: 'Payload truncated',
            })}
            text={
              parsed.truncatedOriginalCount != null
                ? i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.truncatedWithCount',
                    {
                      defaultMessage:
                        'This attachment was truncated. Original count: {originalCount}.',
                      values: { originalCount: parsed.truncatedOriginalCount },
                    }
                  )
                : i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.truncated', {
                    defaultMessage: 'This attachment was truncated.',
                  })
            }
          />
          <EuiSpacer size="s" />
        </>
      )}

      {(parsed.runId || parsed.reportId) && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="xs" wrap responsive={false}>
            {parsed.runId && (
              <EuiFlexItem grow={false}>
                <IocBadge
                  value={parsed.runId}
                  index={0}
                  testSubj="alertzeroSignificantSecurityEventRunId"
                />
              </EuiFlexItem>
            )}
            {parsed.reportId && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.sourceReport', {
                        defaultMessage: 'Source report:',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <IocBadge
                      value={parsed.reportId}
                      index={0}
                      discoverHref={buildDiscoverEsqlUrl({
                        share: navigation.share,
                        esql: buildThreatReportLookupEsql({ reportId: parsed.reportId }),
                      })}
                      testSubj="alertzeroSignificantSecurityEventReportLink"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}

      {parsed.hypothesisTested && (
        <>
          <HypothesisSection hypothesis={parsed.hypothesisTested} />
          <EuiSpacer size="s" />
        </>
      )}

      {parsed.huntResult && (
        <>
          <HuntResultSection huntResult={parsed.huntResult} />
          <EuiSpacer size="s" />
        </>
      )}

      <TimelineSection timeline={parsed.timeline} />

      {hasEventsOrAlerts && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id={`alertzeroSignificantSecurityEventEvents-${attachment.id}`}
            initialIsOpen={false}
            arrowDisplay="right"
            data-test-subj="alertzeroSignificantSecurityEventEventsAccordion"
            buttonContent={
              <FormattedMessage
                id="xpack.alertzero.agentBuilder.attachments.sse.eventsAccordionButton"
                defaultMessage="{count, plural, one {# event} other {# events}}"
                values={{ count: parsed.events.length }}
              />
            }
          >
            <EuiSpacer size="s" />
            <EventRows events={parsed.events} navigation={navigation} />
          </EuiAccordion>
        </>
      )}

      <AlertList alerts={parsed.alerts} navigation={navigation} />

      {parsed.indicators.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <IndicatorList indicators={parsed.indicators} />
        </>
      )}

      {(parsed.evidenceFor.length > 0 || parsed.evidenceAgainst.length > 0) && (
        <>
          <EuiSpacer size="s" />
          <EvidenceSection
            label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceFor', {
              defaultMessage: 'Evidence for',
            })}
            items={parsed.evidenceFor}
          />
          <EvidenceSection
            label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceAgainst', {
              defaultMessage: 'Evidence against',
            })}
            items={parsed.evidenceAgainst}
          />
        </>
      )}

      {parsed.entities.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entities', {
                defaultMessage: 'Entities',
              })}
            </strong>
          </EuiText>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            {parsed.entities.map((entity, index) => (
              <EuiFlexItem grow={false} key={`${entity.field}:${entity.value}:${index}`}>
                <EntityChip
                  entity={entity}
                  share={navigation.share}
                  getUrlForApp={navigation.getUrlForApp}
                  testSubj={`alertzeroSignificantSecurityEventEntity-${index}`}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};

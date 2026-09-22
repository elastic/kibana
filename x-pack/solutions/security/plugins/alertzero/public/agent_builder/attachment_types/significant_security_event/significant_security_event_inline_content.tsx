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
  EuiInMemoryTable,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  euiPaletteColorBlind,
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
  SectionHeading,
  DateTime,
  CompactStat,
  HollowBadgeList,
  AttachmentEmptyState,
  buildMitreTechniqueUrl,
} from '../shared/primitives';
import { LabeledBadgeTable, type LabeledBadgeTableRow } from '../shared/labeled_badge_table';
import { formatPercent } from '../shared/severity';
import { parseSignificantSecurityEventData } from './types';
import type {
  HuntResult,
  MapsToProposal,
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

const visColorPalette = euiPaletteColorBlind();

/** Cycles through the EUI color-blind-safe palette for distribution bar segments. */
const visColorAt = (index: number) => visColorPalette[index % visColorPalette.length];

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
            <DateTime value={timestamp} />
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
      render: (index: string) => <span css={cellStyles}>{index}</span>,
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
        if (!matchedValue) {
          return <span css={cellStyles}>{matched.field}</span>;
        }
        return (
          <span css={cellStyles}>
            {matchedValue}
            {' ('}
            {matched.field}
            {')'}
          </span>
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
    <div data-test-subj="alertzeroSignificantSecurityEventAlerts">
      <SectionHeading>
        <FormattedMessage
          id="xpack.alertzero.agentBuilder.attachments.sse.alertsHeading"
          defaultMessage="{count, plural, one {# alert} other {# alerts}}"
          values={{ count: alerts.length }}
        />
      </SectionHeading>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        {alerts.map((alert) => {
          const href = buildAlertDetailsUrl({
            prependPath: navigation.prependPath,
            spaceId: navigation.spaceId,
            alertId: alert.alert_id,
            index: alert.index,
            timestamp: alert.timestamp,
          });
          return (
            <EuiFlexItem grow={false} key={`${alert.index}:${alert.alert_id}`}>
              <IocBadge
                value={alert.alert_id}
                action={{
                  href,
                  iconType: 'securitySignalDetected',
                  label: OPEN_ALERT_DETAILS_LABEL,
                }}
                testSubj={`alertzeroSignificantSecurityEventAlertLink-${alert.alert_id}`}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};

/**
 * Taxonomy labels only, per `significant_security_event_schema.ts`: not
 * Discover IOCs, so this never links into `logs-*` (do not invent field
 * mappings from `type`). Single `LabeledBadgeTable`: one row per IOC type,
 * one `Techniques` row, and one row per remaining indicator type, matching
 * the Threat Report Indicators shape.
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

  const iocsByType = groupBy(iocIndicators, (indicator) => indicator.ioc?.type ?? 'unknown');

  const rows: LabeledBadgeTableRow[] = Object.entries(iocsByType).map(([iocType, group]) => ({
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

  if (techniqueIndicators.length > 0) {
    rows.push({
      id: 'technique',
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsTechniques', {
        defaultMessage: 'Techniques',
      }),
      values: (
        <>
          {techniqueIndicators.map((indicator, index) => {
            const mitreUrl = indicator.technique_id
              ? buildMitreTechniqueUrl(indicator.technique_id)
              : undefined;
            const linkProps = mitreUrl
              ? { href: mitreUrl, target: '_blank', rel: 'noopener noreferrer', iconType: 'popout' }
              : {};
            return (
              <EuiBadge
                key={`${indicator.type}-${indicator.value}-${index}`}
                color="hollow"
                iconSide="right"
                data-test-subj={`alertzeroSignificantSecurityEventIndicator-technique-${index}`}
                {...linkProps}
              >
                <span css={cellStyles}>
                  {indicator.value}
                  {indicator.confidence != null ? ` (${formatPercent(indicator.confidence)})` : ''}
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
      label: indicatorType,
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
                {indicator.confidence != null ? ` (${formatPercent(indicator.confidence)})` : ''}
              </span>
            </EuiBadge>
          ))}
        </>
      ),
    });
  }

  return (
    <div data-test-subj="alertzeroSignificantSecurityEventIndicators">
      <SectionHeading>
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicators', {
          defaultMessage: 'Indicators',
        })}
      </SectionHeading>
      <EuiSpacer size="xs" />
      <LabeledBadgeTable
        rows={rows}
        caption={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsCaption', {
          defaultMessage: 'Indicators',
        })}
      />
    </div>
  );
};

const EvidenceSection: React.FC<{
  label: string;
  items: string[];
}> = ({ label, items }) => {
  if (items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, EVIDENCE_BULLET_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <>
      <SectionHeading>{label}</SectionHeading>
      <EuiText size="s">
        <ul>
          {visibleItems.map((item) => (
            <li key={item}>
              <span css={cellStyles}>{item}</span>
            </li>
          ))}
        </ul>
      </EuiText>
      {hiddenCount > 0 && (
        <EuiText size="xs" color="subdued" data-test-subj="alertzeroSignificantSecurityEventEvidenceOverflow">
          <FormattedMessage
            id="xpack.alertzero.agentBuilder.attachments.sse.evidenceOverflow"
            defaultMessage="+{hiddenCount} more"
            values={{ hiddenCount }}
          />
        </EuiText>
      )}
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
    <>
      <SectionHeading>{title}</SectionHeading>
      <EuiText size="s">
        <p css={cellStyles}>{hypothesis}</p>
      </EuiText>
    </>
  );
};

const TimelineSection: React.FC<{ timeline: TimelineEntry[] }> = ({ timeline }) => {
  if (timeline.length === 0) {
    return null;
  }

  return (
    <>
      <SectionHeading>
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timeline', {
          defaultMessage: 'Timeline',
        })}
      </SectionHeading>
      <EuiTimeline gutterSize="m" data-test-subj="alertzeroSignificantSecurityEventTimeline">
        {timeline.map((entry, index) => (
          <EuiTimelineItem icon="clock" verticalAlign="top" key={`${entry.at}-${index}`}>
            <EuiText size="xs" color="subdued">
              <p css={{ margin: 0 }}>
                <DateTime value={entry.at} />
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
  technique_id: string;
  tactic_ids: string[];
  confidence: number;
  rule_name: string;
}

const HuntResultSection: React.FC<{ huntResult: HuntResult }> = ({ huntResult }) => {
  const { tier1, tier2 } = huntResult;
  const distributionStats = tier1.per_index.map((row, index) => ({
    key: row.index,
    count: row.hit_count,
    label: row.index,
    color: visColorAt(index),
  }));
  const totalDistributedHits = tier1.per_index.reduce((sum, row) => sum + row.hit_count, 0);

  const tier2Columns: Array<EuiBasicTableColumn<Tier2TableRow>> = [
    {
      field: 'technique_id',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTechnique', {
        defaultMessage: 'Technique',
      }),
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
      render: (ruleName: string) => <span css={cellStyles}>{ruleName}</span>,
    },
    {
      field: 'tactic_ids',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTactics', {
        defaultMessage: 'Tactics',
      }),
      render: (tacticIds: string[]) => <HollowBadgeList items={tacticIds} />,
    },
    {
      field: 'confidence',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultConfidence', {
        defaultMessage: 'Confidence',
      }),
      width: '8em',
      render: (confidence: number) => (
        <EuiProgress size="s" value={confidence} max={1} valueText={formatPercent(confidence)} />
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
    <div data-test-subj="alertzeroSignificantSecurityEventHuntResult">
      <SectionHeading>
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTitle', {
          defaultMessage: 'Hunt result',
        })}
      </SectionHeading>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <DateTime value={huntResult.time_range.from} />
        {' - '}
        <DateTime value={huntResult.time_range.to} />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <CompactStat
            title={tier1.counts.total_hits}
            description={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.huntResultTotalHits',
              { defaultMessage: 'Total hits' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CompactStat
            title={tier1.counts.affected_hosts}
            description={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.huntResultAffectedHosts',
              { defaultMessage: 'Affected hosts' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CompactStat
            title={tier1.counts.affected_users}
            description={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.huntResultAffectedUsers',
              { defaultMessage: 'Affected users' }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {distributionStats.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <DistributionBar
            stats={distributionStats}
            hideLastTooltip
            data-test-subj="alertzeroSignificantSecurityEventHuntResultDistributionBar"
          />
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="m" wrap responsive={false}>
            {distributionStats.map((stat) => (
              <EuiFlexItem grow={false} key={stat.key}>
                <EuiHealth color={stat.color} textSize="xs">
                  {stat.label} ({stat.count})
                </EuiHealth>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertzero.agentBuilder.attachments.sse.huntResultDistributionSummary"
              defaultMessage="{hits, plural, one {# event} other {# events}} across {indices, plural, one {# index} other {# indices}}"
              values={{ hits: totalDistributedHits, indices: tier1.per_index.length }}
            />
          </EuiText>
        </>
      )}

      {tier2Rows.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiBasicTable<Tier2TableRow>
            compressed
            tableLayout="auto"
            responsiveBreakpoint={false}
            rowHeader="technique_id"
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

const ProposalSection: React.FC<{ proposal: MapsToProposal }> = ({ proposal }) => {
  const { category, impact, confidence, actionWorkflowId, manual_remediation: manualSteps } =
    proposal;

  if (
    !category &&
    !impact &&
    confidence == null &&
    !actionWorkflowId &&
    !manualSteps?.length
  ) {
    return null;
  }

  return (
    <div data-test-subj="alertzeroSignificantSecurityEventProposal">
      <SectionHeading>
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.proposal', {
          defaultMessage: 'Proposal',
        })}
      </SectionHeading>
      <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
        {category && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{category}</EuiBadge>
          </EuiFlexItem>
        )}
        {confidence != null && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {formatPercent(confidence)}
            </EuiText>
          </EuiFlexItem>
        )}
        {actionWorkflowId && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.proposalWorkflow', {
                defaultMessage: 'Action workflow: {actionWorkflowId}',
                values: { actionWorkflowId },
              })}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {impact && (
        <EuiText size="s">
          <span css={cellStyles}>{impact}</span>
        </EuiText>
      )}
      {manualSteps && manualSteps.length > 0 && (
        <EuiText size="s">
          <ul>
            {manualSteps.map((step) => (
              <li key={step}>
                <span css={cellStyles}>{step}</span>
              </li>
            ))}
          </ul>
        </EuiText>
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
      <AttachmentEmptyState
        testSubj={SSE_ATTACHMENT_EMPTY_TEST_ID}
        message={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.empty', {
          defaultMessage: 'No significant security event data available',
        })}
      />
    );
  }

  const hasEvents = (parsed.events ?? []).length > 0;

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
          <EuiSpacer size="s" />
        </>
      )}

      {(parsed.run_id || parsed.report_id) && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="xs" wrap responsive={false}>
            {parsed.run_id && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.runId', {
                        defaultMessage: 'Run id:',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <IocBadge
                      value={parsed.run_id}
                      testSubj="alertzeroSignificantSecurityEventRunId"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {parsed.report_id && (
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
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}

      {parsed.hypothesis_tested && (
        <>
          <HypothesisSection hypothesis={parsed.hypothesis_tested} />
          <EuiSpacer size="s" />
        </>
      )}

      {parsed.hunt_result && (
        <>
          <HuntResultSection huntResult={parsed.hunt_result} />
          <EuiSpacer size="s" />
        </>
      )}

      {parsed.maps_to_proposal && (
        <>
          <ProposalSection proposal={parsed.maps_to_proposal} />
          <EuiSpacer size="s" />
        </>
      )}

      <TimelineSection timeline={parsed.timeline} />

      {hasEvents && (
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
                values={{ count: (parsed.events ?? []).length }}
              />
            }
          >
            <EuiSpacer size="s" />
            <EventRows events={parsed.events ?? []} navigation={navigation} />
          </EuiAccordion>
        </>
      )}

      <AlertList alerts={parsed.alerts ?? []} navigation={navigation} />

      {parsed.security_knowledge_indicators.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <IndicatorList indicators={parsed.security_knowledge_indicators} />
        </>
      )}

      {(parsed.evidence_for.length > 0 || parsed.evidence_against.length > 0) && (
        <>
          <EuiSpacer size="s" />
          <EvidenceSection
            label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceFor', {
              defaultMessage: 'Evidence for',
            })}
            items={parsed.evidence_for}
          />
          <EvidenceSection
            label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceAgainst', {
              defaultMessage: 'Evidence against',
            })}
            items={parsed.evidence_against}
          />
        </>
      )}

      {parsed.entities.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entities', {
              defaultMessage: 'Entities',
            })}
          </SectionHeading>
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

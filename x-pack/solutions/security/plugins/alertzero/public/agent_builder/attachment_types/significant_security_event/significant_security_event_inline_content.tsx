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
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import {
  buildAlertDetailsUrl,
  buildDiscoverEsqlUrl,
  buildEventLookupEsql,
  buildThreatReportLookupEsql,
  DiscoverLink,
} from '../navigation';
import { EntityChip } from '../entity_chip';
import { parseSignificantSecurityEventData } from './types';
import type {
  ParsedSignificantSecurityEvent,
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

const SEVERITY_COLOR_MAP: Record<string, string> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const formatProvenanceMeta = (parsed: ParsedSignificantSecurityEvent): string =>
  [parsed.sourceWatch, parsed.capability, parsed.runId].filter(Boolean).join(' · ');

const EventRows: React.FC<{
  events: SignificantSecurityEventRef[];
  navigation: AttachmentNavigationDeps;
}> = ({ events, navigation }) => {
  if (events.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <span css={cellStyles}>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventsEmpty', {
            defaultMessage: 'No events recorded',
          })}
        </span>
      </EuiText>
    );
  }

  return (
    <EuiBasicTable<SignificantSecurityEventRef>
      tableCaption={i18n.translate(
        'xpack.alertzero.agentBuilder.attachments.sse.eventsTableCaption',
        { defaultMessage: 'Significant security event related events' }
      )}
      items={events}
      columns={[
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
              <DiscoverLink
                href={href}
                testSubj={`alertzeroSignificantSecurityEventEventLink-${event.event_id}`}
              >
                <span css={cellStyles}>{event.event_id}</span>
              </DiscoverLink>
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
      ]}
    />
  );
};

const AlertList: React.FC<{
  alerts: SignificantSecurityAlertRef[];
  navigation: AttachmentNavigationDeps;
}> = ({ alerts, navigation }) => {
  if (alerts.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <span css={cellStyles}>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.alertsEmpty', {
            defaultMessage: 'No alerts recorded',
          })}
        </span>
      </EuiText>
    );
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
              <DiscoverLink
                href={href}
                testSubj={`alertzeroSignificantSecurityEventAlertLink-${alert.alert_id}`}
              >
                <span css={cellStyles}>{alert.alert_id}</span>
              </DiscoverLink>
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
 * distinct shape worth a distinct treatment (badges grouped by IOC type;
 * technique badges with confidence and an external MITRE ATT&CK reference,
 * which is a public documentation link, not a Discover query, so the
 * taxonomy-only contract above still holds). Any other schema-valid type
 * (`technology`, `risk`) falls into a plain fallback list so a future
 * indicator type still renders instead of disappearing silently.
 */
const IndicatorList: React.FC<{
  indicators: SecurityKnowledgeIndicator[];
}> = ({ indicators }) => {
  if (indicators.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <span css={cellStyles}>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsEmpty', {
            defaultMessage: 'No indicators recorded',
          })}
        </span>
      </EuiText>
    );
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

  return (
    <>
      {iocIndicators.length > 0 && (
        <div data-test-subj="alertzeroSignificantSecurityEventIndicatorIocs" css={{ marginBottom: 8 }}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsIocs', {
              defaultMessage: 'IOCs',
            })}
          </EuiText>
          {[...iocsByType.entries()].map(([iocType, group]) => (
            <div key={iocType} css={{ marginBottom: 4 }}>
              <EuiText size="xs" color="subdued" css={cellStyles}>
                {iocType}
              </EuiText>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                {group.map((indicator, index) => (
                  <EuiFlexItem
                    grow={false}
                    key={`${indicator.type}-${indicator.value}-${index}`}
                  >
                    <EuiBadge
                      color="hollow"
                      data-test-subj={`alertzeroSignificantSecurityEventIndicator-ioc-${index}`}
                    >
                      <span css={cellStyles}>{indicator.value}</span>
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </div>
          ))}
        </div>
      )}

      {techniqueIndicators.length > 0 && (
        <div
          data-test-subj="alertzeroSignificantSecurityEventIndicatorTechniques"
          css={{ marginBottom: 8 }}
        >
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicatorsTechniques', {
              defaultMessage: 'Techniques',
            })}
          </EuiText>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            {techniqueIndicators.map((indicator, index) => {
              const mitreUrl = indicator.technique_id
                ? `https://attack.mitre.org/techniques/${indicator.technique_id.replace('.', '/')}/`
                : undefined;
              const badge = (
                <EuiBadge
                  color="hollow"
                  data-test-subj={`alertzeroSignificantSecurityEventIndicator-technique-${index}`}
                >
                  <span css={cellStyles}>
                    {indicator.value}
                    {indicator.confidence != null ? ` (${indicator.confidence})` : ''}
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
                  {indicator.confidence != null ? ` (${indicator.confidence})` : ''}
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

  const provenance = formatProvenanceMeta(parsed);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj={SSE_ATTACHMENT_TEST_ID}>
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

      <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong css={cellStyles}>{parsed.title}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={SEVERITY_COLOR_MAP[parsed.severity] ?? 'hollow'}>
            {parsed.confidence != null
              ? `${parsed.severity} (${parsed.confidence})`
              : parsed.severity}
          </EuiBadge>
        </EuiFlexItem>
        {parsed.status && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <span css={cellStyles}>{parsed.status}</span>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {provenance && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <span css={cellStyles}>{provenance}</span>
          </EuiText>
        </>
      )}

      {parsed.reportId && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.sourceReport', {
              defaultMessage: 'Source report: ',
            })}
            <DiscoverLink
              href={buildDiscoverEsqlUrl({
                share: navigation.share,
                esql: buildThreatReportLookupEsql({ reportId: parsed.reportId }),
              })}
              testSubj="alertzeroSignificantSecurityEventReportLink"
            >
              <span css={cellStyles}>{parsed.reportId}</span>
            </DiscoverLink>
          </EuiText>
        </>
      )}

      {parsed.hypothesisTested && (
        <>
          <EuiSpacer size="s" />
          <HypothesisSection hypothesis={parsed.hypothesisTested} />
        </>
      )}

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timeline', {
            defaultMessage: 'Timeline',
          })}
        </strong>
      </EuiText>
      {parsed.timeline.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timelineEmpty', {
            defaultMessage: 'No timeline entries recorded',
          })}
        </EuiText>
      ) : (
        <EuiBasicTable<TimelineEntry>
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.sse.timelineTableCaption',
            { defaultMessage: 'Significant security event timeline' }
          )}
          items={parsed.timeline}
          columns={[
            {
              field: 'at',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timelineAt', {
                defaultMessage: 'When',
              }),
              width: '10em',
            },
            {
              field: 'what',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timelineWhat', {
                defaultMessage: 'What',
              }),
              render: (what: string) => <span css={cellStyles}>{what}</span>,
            },
          ]}
        />
      )}

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.events', {
            defaultMessage: 'Events',
          })}
        </strong>
      </EuiText>
      <EventRows events={parsed.events} navigation={navigation} />

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.alerts', {
            defaultMessage: 'Alerts',
          })}
        </strong>
      </EuiText>
      <AlertList alerts={parsed.alerts} navigation={navigation} />

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indicators', {
            defaultMessage: 'Indicators',
          })}
        </strong>
      </EuiText>
      <IndicatorList indicators={parsed.indicators} />

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

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entities', {
            defaultMessage: 'Entities',
          })}
        </strong>
      </EuiText>
      <EuiText size="s">
        {parsed.entities.length === 0 ? (
          <span css={cellStyles}>
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entitiesEmpty', {
              defaultMessage: 'No entities recorded',
            })}
          </span>
        ) : (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            {parsed.entities.map((entity, index) => (
              <EuiFlexItem grow={false} key={`${entity.field}:${entity.value}:${index}`}>
                <EntityChip
                  entity={entity}
                  share={navigation.share}
                  testSubj={`alertzeroSignificantSecurityEventEntity-${index}`}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiText>

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceCounts', {
          defaultMessage:
            'Evidence for: {forCount} · Evidence against: {againstCount} · Indicators: {indicatorCount}',
          values: {
            forCount: parsed.evidenceForCount,
            againstCount: parsed.evidenceAgainstCount,
            indicatorCount: parsed.indicators.length,
          },
        })}
      </EuiText>
    </EuiPanel>
  );
};

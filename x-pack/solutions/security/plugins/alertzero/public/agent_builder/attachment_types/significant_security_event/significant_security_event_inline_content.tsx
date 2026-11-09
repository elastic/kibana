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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
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
  buildIocMatchEsql,
  buildWorkflowExecutionUrl,
} from '../navigation';
import { EntityChip } from '../entity_chip';
import { IocBadge, OPEN_ALERT_DETAILS_LABEL } from '../shared/ioc_badge';
import {
  Section,
  SectionStack,
  SectionHeading,
  DateTime,
  BadgeRow,
  InlineLabel,
  TableFrame,
  AttachmentEmptyState,
  buildMitreTechniqueUrl,
} from '../shared/primitives';
import { LabeledBadgeTable, type LabeledBadgeTableRow } from '../shared/labeled_badge_table';
import { formatPercent } from '../shared/severity';
import {
  basisHeaderBadge,
  buildSignificantSecurityEventActionButtons,
  parseSignificantSecurityEventData,
  toSseViewModel,
} from './view_model';
import type {
  HuntResult,
  HuntResultBehavior,
  HuntResultBehaviorExecution,
  SignificantSecurityAlertRef,
  SignificantSecurityEventAttachment,
  SignificantSecurityEventRef,
  SseEntityLine,
} from './view_model';
import { isExecutableHuntQuery, observedIocMatchFromEvents } from '../../../../common/sse_view';
import type { SseDetection, SseEventGroup } from '../../../../common/sse_view';

export interface SignificantSecurityEventInlineContentProps
  extends AttachmentRenderProps<SignificantSecurityEventAttachment> {
  navigation: AttachmentNavigationDeps;
}

export const SSE_ATTACHMENT_TEST_ID = 'alertzeroSignificantSecurityEventAttachment';
export const SSE_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroSignificantSecurityEventAttachmentEmpty';
export const SSE_ATTACHMENT_HEADLINE_TEST_ID = 'alertzeroSignificantSecurityEventHeadline';
export const SSE_ATTACHMENT_BASIS_TEST_ID = 'alertzeroSignificantSecurityEventBasis';
export const SSE_ATTACHMENT_ENTITY_LINE_TEST_ID = 'alertzeroSignificantSecurityEventEntityLine';
export const SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID = 'alertzeroSignificantSecurityEventWhatMatched';
export const SSE_ATTACHMENT_INDEX_HITS_TEST_ID = 'alertzeroSignificantSecurityEventIndexHits';
export const SSE_ATTACHMENT_QUERIES_RUN_TEST_ID = 'alertzeroSignificantSecurityEventQueriesRun';
export const SSE_ATTACHMENT_RUN_PROVENANCE_TEST_ID =
  'alertzeroSignificantSecurityEventRunProvenance';
export const SSE_ATTACHMENT_SEARCHED_FOR_TEST_ID = 'alertzeroSignificantSecurityEventSearchedFor';

const EVIDENCE_BULLET_LIMIT = 5;
const ENTITY_CHIP_LIMIT = 10;

/** Plain monospace value; truncates long ids and keeps the full string in a tooltip. */
const PlainValue: React.FC<{ value: string; testSubj?: string; maxCh?: number }> = ({
  value,
  testSubj,
  maxCh = 32,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiToolTip content={value}>
      <EuiText
        size="xs"
        component="span"
        data-test-subj={testSubj}
        css={css`
          font-family: ${euiTheme.font.familyCode};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: ${maxCh}ch;
          display: inline-block;
          vertical-align: bottom;
        `}
      >
        {value}
      </EuiText>
    </EuiToolTip>
  );
};

const TIER1_STATUS_LABELS: Record<HuntResult['tier1']['status'], string> = {
  // No required index existed, so Tier 1 never searched. Worded as a failed run rather than a
  // quiet one: the other three statuses describe an environment, this one describes a gap.
  scope_blocked: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.tier1ScopeBlocked', {
    defaultMessage: 'Hunt did not run: scope blocked',
  }),
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

const TIER_LABELS: Record<HuntResult['hit_sources'][number], string> = {
  tier1: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.tier1Prefix', {
    defaultMessage: 'IOC Hunt',
  }),
  tier2: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.tier2Prefix', {
    defaultMessage: 'Behavior Hunt',
  }),
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

const cellStyles = css`
  overflow-wrap: anywhere;
`;

const visColorPalette = euiPaletteColorBlind();

/** Cycles through the EUI color-blind-safe palette for distribution bar segments. */
const visColorAt = (index: number) => visColorPalette[index % visColorPalette.length];

const hostsLabel = (count: number): string =>
  i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entityLineHosts', {
    defaultMessage: '{count, plural, one {# host} other {# hosts}}',
    values: { count },
  });

const usersLabel = (count: number): string =>
  i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entityLineUsers', {
    defaultMessage: '{count, plural, one {# user} other {# users}}',
    values: { count },
  });

const eventsLabel = (count: number): string =>
  i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.detectionEvents', {
    defaultMessage: '{count, plural, one {# event} other {# events}}',
    values: { count },
  });

/**
 * Producer-set marker that a list is a subset of what the run found. Rendered wherever the
 * schema carries a `*_truncated` flag, because the length of the list below is otherwise the
 * only thing a reader has to go on, and a silent cut reads as the complete set.
 */
const PartialListNote: React.FC<{ label: string; testSubj: string }> = ({ label, testSubj }) => (
  <EuiText size="xs" color="subdued" component="span" data-test-subj={testSubj}>
    <EuiIcon type="scissors" size="s" color="subdued" aria-hidden /> {label}
  </EuiText>
);

const PARTIAL_BREAKDOWN_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.partialBreakdown',
  { defaultMessage: 'Partial breakdown' }
);

const PARTIAL_LIST_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.partialList',
  { defaultMessage: 'Partial list' }
);

const EventRows: React.FC<{
  events: SignificantSecurityEventRef[];
  navigation: AttachmentNavigationDeps;
}> = ({ events, navigation }) => {
  const { euiTheme } = useEuiTheme();
  const columns: Array<EuiBasicTableColumn<SignificantSecurityEventRef>> = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventWhen', {
        defaultMessage: 'When',
      }),
      width: '8.5em',
      render: (timestamp: string | undefined) =>
        timestamp ? (
          <EuiToolTip content={<DateTime value={timestamp} />}>
            <EuiText
              size="xs"
              css={css`
                min-width: 0;
                max-width: 100%;
                overflow-wrap: anywhere;
                white-space: normal;
              `}
            >
              <DateTime value={timestamp} />
            </EuiText>
          </EuiToolTip>
        ) : null,
    },
    {
      field: 'event_id',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventId', {
        defaultMessage: 'Event',
      }),
      width: '11em',
      render: (_eventId: string, event: SignificantSecurityEventRef) => {
        const esql = buildEventLookupEsql({
          index: event.source_index,
          eventId: event.event_id,
        });
        const href = buildDiscoverEsqlUrl({ share: navigation.share, esql });
        const openLabel = i18n.translate(
          'xpack.alertzero.agentBuilder.attachments.sse.eventOpenInDiscoverAria',
          {
            defaultMessage: 'Open event {eventId} in Discover',
            values: { eventId: event.event_id },
          }
        );
        const idText = (
          <PlainValue
            value={event.event_id}
            maxCh={18}
            testSubj={`alertzeroSignificantSecurityEventEventLink-${event.event_id}`}
          />
        );
        return (
          <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              {href ? (
                <EuiLink
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={openLabel}
                >
                  {idText}
                </EuiLink>
              ) : (
                idText
              )}
            </EuiFlexItem>
            {event.source_index ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={event.source_index}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    css={css`
                      font-family: ${euiTheme.font.familyCode};
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                      max-width: 11em;
                    `}
                  >
                    {event.source_index}
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'fields',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventFields', {
        defaultMessage: 'Fields',
      }),
      // Claim the leftover width under tableLayout=fixed so values stay readable.
      render: (fields: SignificantSecurityEventRef['fields']) => {
        const entries = fields ? Object.entries(fields) : [];
        if (entries.length === 0) {
          return null;
        }
        return (
          <EuiText
            size="xs"
            css={css`
              line-height: ${euiTheme.font.lineHeightMultiplier};
              overflow-wrap: break-word;
              word-break: normal;
              min-width: 0;
            `}
          >
            {entries.map(([key, value]) => (
              <div key={key}>
                <span css={{ color: euiTheme.colors.textSubdued }}>{key}</span>
                {': '}
                <span css={{ color: euiTheme.colors.textParagraph }}>{value}</span>
              </div>
            ))}
          </EuiText>
        );
      },
    },
    {
      field: 'matched',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.eventMatched', {
        defaultMessage: 'Matched on',
      }),
      width: '9em',
      render: (matched: SignificantSecurityEventRef['matched']) => {
        if (!matched) {
          return null;
        }
        const matchedValue = matched.ioc?.value ?? matched.technique_id;
        return (
          <div
            css={css`
              min-width: 0;
              max-width: 100%;
              overflow: hidden;
            `}
          >
            {matchedValue ? (
              <EuiText size="xs" component="div">
                <strong>
                  <PlainValue value={matchedValue} maxCh={14} />
                </strong>
              </EuiText>
            ) : null}
            {matched.field ? (
              <EuiToolTip content={matched.field}>
                <EuiText
                  size="xs"
                  color="subdued"
                  component="div"
                  css={css`
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  `}
                >
                  {matched.field}
                </EuiText>
              </EuiToolTip>
            ) : null}
          </div>
        );
      },
    },
  ];

  const sortedEvents = [...events].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return b.timestamp.localeCompare(a.timestamp);
  });

  return (
    <div
      css={css`
        min-width: 0;
        overflow: hidden;

        .euiTableCellContent {
          min-width: 0;
        }
      `}
    >
      <EuiInMemoryTable<SignificantSecurityEventRef>
        tableCaption={i18n.translate(
          'xpack.alertzero.agentBuilder.attachments.sse.eventsTableCaption',
          { defaultMessage: 'Significant security event related events' }
        )}
        items={sortedEvents}
        columns={columns}
        compressed
        tableLayout="fixed"
        responsiveBreakpoint={false}
        pagination={
          sortedEvents.length > 5 ? { initialPageSize: 5, pageSizeOptions: [5, 10, 25] } : undefined
        }
      />
    </div>
  );
};

/**
 * Cited events bucketed by the detection each belongs to (D13), one list per group with a
 * `N shown of M` footer so a sampled group does not read as the whole set.
 */
const GroupedEvents: React.FC<{
  eventGroups: SseEventGroup[];
  navigation: AttachmentNavigationDeps;
}> = ({ eventGroups, navigation }) => (
  <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
    {eventGroups.map((group) => (
      <EuiFlexItem grow={false} key={group.detectionId ?? group.label}>
        <SectionHeading>{group.label}</SectionHeading>
        <EuiSpacer size="xs" />
        <EventRows events={group.events} navigation={navigation} />
        <EuiSpacer size="xs" />
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj="alertzeroSignificantSecurityEventEventsGroupFooter"
        >
          {group.total != null ? (
            <FormattedMessage
              id="xpack.alertzero.agentBuilder.attachments.sse.eventsGroupShownOfTotal"
              defaultMessage="{shown} shown of {total}"
              values={{ shown: group.events.length, total: group.total }}
            />
          ) : (
            <FormattedMessage
              id="xpack.alertzero.agentBuilder.attachments.sse.eventsGroupShown"
              defaultMessage="{shown, plural, one {# shown} other {# shown}}"
              values={{ shown: group.events.length }}
            />
          )}
        </EuiText>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

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

const EvidenceColumn: React.FC<{
  label: string;
  iconType: string;
  iconColor: string;
  items: string[];
}> = ({ label, iconType, iconColor, items }) => {
  const { euiTheme } = useEuiTheme();
  // The schema accepts 50 items per side, so the overflow has to be reachable: the hidden
  // items are the hunt's own reasoning, and evidence against is what argues the finding down.
  const [isExpanded, setIsExpanded] = React.useState(false);
  if (items.length === 0) {
    return null;
  }

  const visibleItems = isExpanded ? items : items.slice(0, EVIDENCE_BULLET_LIMIT);
  const hiddenCount = Math.max(items.length - EVIDENCE_BULLET_LIMIT, 0);

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
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType={isExpanded ? 'chevronSingleUp' : 'chevronSingleDown'}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            data-test-subj="alertzeroSignificantSecurityEventEvidenceOverflow"
          >
            {isExpanded
              ? i18n.translate(
                  'xpack.alertzero.agentBuilder.attachments.sse.evidenceOverflowCollapse',
                  { defaultMessage: 'Show fewer' }
                )
              : i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceOverflow', {
                  defaultMessage: '+{hiddenCount} more',
                  values: { hiddenCount },
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexItem>
  );
};

const HypothesisSection: React.FC<{ hypothesis: string }> = ({ hypothesis }) => (
  <Section
    title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.hypothesis', {
      defaultMessage: 'Hypothesis',
    })}
  >
    <EuiText size="s" data-test-subj="alertzeroSignificantSecurityEventHypothesis">
      <p css={[cellStyles, { margin: 0 }]}>{hypothesis}</p>
    </EuiText>
  </Section>
);

/**
 * Producer chrome often restates Tier 1 / Tier 2 hit counts already shown by What matched
 * and the confirmed-hit badge. Keep those bullets only when there is no structured detection
 * table; keep every evidence_against bullet (negative findings are not on What matched).
 */
const isRestatementEvidenceFor = (item: string): boolean =>
  /^(IOC Hunt matched|Behavior Hunt executed|Environment hit confirmed)/.test(item);

const filterStoryEvidence = ({
  evidenceFor,
  evidenceAgainst,
  hasDetections,
}: {
  evidenceFor: string[];
  evidenceAgainst: string[];
  hasDetections: boolean;
}): { evidenceFor: string[]; evidenceAgainst: string[] } => {
  if (!hasDetections) {
    return { evidenceFor, evidenceAgainst };
  }
  return {
    evidenceFor: evidenceFor.filter((item) => !isRestatementEvidenceFor(item)),
    evidenceAgainst,
  };
};

const SAMPLE_ENTITY_LIMIT = 3;

/**
 * What a detection's host/user/time scope is, and a note when those came from the sampled
 * hits rather than aggregations, so a `from_sample` count does not read as the wide total.
 * Named hosts/users (when present) sit under the counts so Scope is not a bare total.
 */
const DetectionScope: React.FC<{ detection: SseDetection }> = ({ detection }) => {
  const parts = [eventsLabel(detection.total)];
  if (detection.host_count != null) {
    parts.push(hostsLabel(detection.host_count));
  }
  if (detection.user_count != null) {
    parts.push(usersLabel(detection.user_count));
  }

  const sampleHosts = (detection.hosts ?? []).slice(0, SAMPLE_ENTITY_LIMIT);
  const sampleUsers = (detection.users ?? []).slice(0, SAMPLE_ENTITY_LIMIT);
  const hiddenHosts = Math.max((detection.hosts?.length ?? 0) - SAMPLE_ENTITY_LIMIT, 0);
  const hiddenUsers = Math.max((detection.users?.length ?? 0) - SAMPLE_ENTITY_LIMIT, 0);

  const hostLine =
    sampleHosts.length > 0
      ? `${sampleHosts.join(', ')}${
          hiddenHosts > 0
            ? i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.sse.detectionScopeMoreHosts',
                {
                  defaultMessage: ' +{count} more',
                  values: { count: hiddenHosts },
                }
              )
            : ''
        }`
      : undefined;
  const userLine =
    sampleUsers.length > 0
      ? `${sampleUsers.join(', ')}${
          hiddenUsers > 0
            ? i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.sse.detectionScopeMoreUsers',
                {
                  defaultMessage: ' +{count} more',
                  values: { count: hiddenUsers },
                }
              )
            : ''
        }`
      : undefined;

  return (
    <EuiText size="xs" css={cellStyles}>
      <div>{parts.join(' · ')}</div>
      {hostLine || userLine ? (
        <EuiText size="xs" color="subdued" component="div">
          {[hostLine, userLine].filter(Boolean).join(' · ')}
        </EuiText>
      ) : null}
      {detection.from_sample ? (
        <EuiText size="xs" color="subdued" component="div">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.detectionFromSample', {
            defaultMessage: 'From sampled hits',
          })}
        </EuiText>
      ) : null}
    </EuiText>
  );
};

const DetectionSeen: React.FC<{ detection: SseDetection }> = ({ detection }) => {
  if (!detection.first_seen && !detection.last_seen) {
    return null;
  }
  return (
    <EuiText size="xs" color="subdued" css={{ whiteSpace: 'nowrap' }}>
      {detection.first_seen ? <DateTime value={detection.first_seen} /> : null}
      {detection.first_seen && detection.last_seen ? ' – ' : null}
      {detection.last_seen && detection.last_seen !== detection.first_seen ? (
        <DateTime value={detection.last_seen} />
      ) : null}
    </EuiText>
  );
};

/** Prefer the stored MITRE name; fall back to the Behavior Hunt proposal title when absent. */
const behaviorDisplayName = (
  detection: SseDetection,
  huntResult?: HuntResult
): string | undefined => {
  if (detection.technique_name) {
    return detection.technique_name;
  }
  if (!detection.technique_id) {
    return undefined;
  }
  return huntResult?.tier2?.behaviors.find(
    (behavior) => behavior.technique_id === detection.technique_id
  )?.title;
};

const DETECTION_OPEN_IN_DISCOVER_ARIA = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.detectionOpenInDiscover',
  { defaultMessage: 'Open in Discover' }
);

const DetectionDiscoverPivot: React.FC<{ href: string; testSubj?: string }> = ({
  href,
  testSubj,
}) => (
  <EuiFlexItem grow={false}>
    <EuiButtonIcon
      size="xs"
      iconType="discoverApp"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...(testSubj ? { 'data-test-subj': testSubj } : {})}
      aria-label={DETECTION_OPEN_IN_DISCOVER_ARIA}
    />
  </EuiFlexItem>
);

/**
 * The IOCs and behaviors that matched (D10). IOC rows pivot to Discover over the indices
 * cited events came from (else every Tier 1 index) for the exact field and value; behavior
 * rows reuse the behavior's stored query. A pivot is withheld when the detection has no
 * field, or there are no indices to search.
 */
const WhatMatched: React.FC<{
  detections: SseDetection[];
  events: SignificantSecurityEventRef[];
  huntResult?: HuntResult;
  navigation: AttachmentNavigationDeps;
}> = ({ detections, events, huntResult, navigation }) => {
  const fallbackIndices = huntResult?.tier1.per_index.map((row) => row.index) ?? [];
  const timeRange = huntResult?.time_range;

  const iocPivotHref = (detection: SseDetection): string | undefined => {
    if (!navigation.share || !timeRange || !detection.field) {
      return undefined;
    }
    const value = detection.matched_on[0]?.value;
    if (!value) {
      return undefined;
    }
    const observed = observedIocMatchFromEvents(events, value);
    const indices = observed && observed.indices.length > 0 ? observed.indices : fallbackIndices;
    const esql = buildIocMatchEsql({ indices, field: detection.field, value });
    if (!esql) {
      return undefined;
    }
    return buildDiscoverEsqlUrl({
      share: navigation.share,
      esql,
      timeRange: { from: timeRange.from, to: timeRange.to },
      useHash: true,
    });
  };

  const behaviorPivotHref = (detection: SseDetection): string | undefined => {
    if (!navigation.share || !timeRange || !detection.technique_id) {
      return undefined;
    }
    const esql = huntResult?.tier2?.behaviors.find(
      (behavior) => behavior.technique_id === detection.technique_id
    )?.validated_esql;
    if (!esql) {
      return undefined;
    }
    return buildDiscoverEsqlUrl({
      share: navigation.share,
      esql,
      timeRange: { from: timeRange.from, to: timeRange.to },
      useHash: true,
    });
  };

  const showSeenColumn = detections.some(
    (detection) => detection.first_seen != null || detection.last_seen != null
  );

  const columns: Array<EuiBasicTableColumn<SseDetection>> = [
    {
      field: 'matched_on',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.detectionMatched', {
        defaultMessage: 'What matched',
      }),
      render: (_matchedOn: SseDetection['matched_on'], detection: SseDetection) => {
        if (detection.kind === 'behavior') {
          const techniqueId = detection.technique_id ?? '';
          const displayName = behaviorDisplayName(detection, huntResult);
          const href = behaviorPivotHref(detection);
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={true} css={{ minWidth: 0 }}>
                <EuiLink
                  href={buildMitreTechniqueUrl(techniqueId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj={`alertzeroSignificantSecurityEventDetectionTechnique-${techniqueId}`}
                >
                  <EuiText size="xs" component="span">
                    <strong>{techniqueId}</strong>
                  </EuiText>
                </EuiLink>
                {displayName ? (
                  <EuiText size="xs" color="subdued" component="div" css={cellStyles}>
                    {displayName}
                  </EuiText>
                ) : null}
              </EuiFlexItem>
              {href ? (
                <DetectionDiscoverPivot
                  href={href}
                  testSubj={`alertzeroSignificantSecurityEventDetectionPivot-${detection.id}`}
                />
              ) : null}
            </EuiFlexGroup>
          );
        }

        const value = detection.matched_on[0]?.value ?? '';
        const href = iocPivotHref(detection);
        return (
          <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={true} css={{ minWidth: 0 }}>
              <EuiText
                size="xs"
                component="div"
                data-test-subj={`alertzeroSignificantSecurityEventDetectionPivot-${detection.id}`}
              >
                <strong>{value}</strong>
              </EuiText>
              {detection.field ? (
                <EuiText size="xs" color="subdued" component="div" css={cellStyles}>
                  {detection.field}
                </EuiText>
              ) : null}
            </EuiFlexItem>
            {href ? <DetectionDiscoverPivot href={href} /> : null}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'total',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.detectionScope', {
        defaultMessage: 'Scope',
      }),
      render: (_total: number, detection: SseDetection) => <DetectionScope detection={detection} />,
    },
  ];

  if (showSeenColumn) {
    columns.push({
      field: 'last_seen',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.detectionSeen', {
        defaultMessage: 'Seen',
      }),
      render: (_lastSeen: string | undefined, detection: SseDetection) => (
        <DetectionSeen detection={detection} />
      ),
    });
  }

  return (
    <Section
      testSubj={SSE_ATTACHMENT_WHAT_MATCHED_TEST_ID}
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.whatMatched', {
        defaultMessage: 'What matched',
      })}
    >
      <TableFrame>
        <EuiInMemoryTable<SseDetection>
          compressed
          tableLayout="auto"
          responsiveBreakpoint={false}
          rowHeader="id"
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.sse.whatMatchedTableCaption',
            { defaultMessage: 'Detections that matched' }
          )}
          items={detections}
          columns={columns}
          pagination={
            detections.length > 5 ? { initialPageSize: 5, pageSizeOptions: [5, 10, 25] } : undefined
          }
        />
      </TableFrame>
    </Section>
  );
};

/**
 * What the behavior's query actually found, which the rest of the row does not say: technique,
 * finding and report match describe the proposal, not its result.
 *
 * Absent `execution` is labeled `Unreported` rather than left blank: a query that is in the
 * table ran or was meant to run, so "no result reported" is itself the outcome. A non-executed
 * run still surfaces its `inconclusive_reason` when the producer gave one.
 */
const BehaviorExecutionCell: React.FC<{ execution?: HuntResultBehaviorExecution }> = ({
  execution,
}) => {
  if (!execution) {
    return (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.behaviorUnreported', {
          defaultMessage: 'Unreported',
        })}
      </EuiBadge>
    );
  }

  if (!execution.executed) {
    return (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.behaviorNotExecuted', {
              defaultMessage: 'Not executed',
            })}
          </EuiBadge>
        </EuiFlexItem>
        {execution.inconclusive_reason ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" css={cellStyles}>
              {execution.inconclusive_reason}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }

  if (execution.hit) {
    return (
      <EuiBadge color="danger">
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.behaviorHit', {
          defaultMessage: 'Hit: {count, plural, one {# row} other {# rows}}',
          values: { count: execution.row_count },
        })}
      </EuiBadge>
    );
  }

  if (execution.inconclusive_reason) {
    return (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.behaviorInconclusive', {
              defaultMessage: 'Inconclusive',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" css={cellStyles}>
            {execution.inconclusive_reason}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiBadge color="success">
      {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.behaviorClean', {
        defaultMessage: 'No rows',
      })}
    </EuiBadge>
  );
};

interface QueriesRunRow {
  behavior: HuntResultBehavior;
  /** Index in `tier2.behaviors`, which names the row for assistive tech and keeps shared ids apart. */
  rowIndex: number;
}

/**
 * Copy always, and a Discover exit for the stored query over the hunt window. The exit is
 * gated on the query being runnable, not on it having executed: an analyst can open a proposal
 * that never ran (`Open in Discover`) as readily as continue one that did (`Continue in
 * Discover`). A query that validates but is too long to carry in a redirect falls back to Copy
 * with a hint, so the analyst still has the exact text.
 */
const QueryRowActions: React.FC<{
  row: QueriesRunRow;
  timeRange: HuntResult['time_range'];
  navigation: AttachmentNavigationDeps;
}> = ({ row, timeRange, navigation }) => {
  const { behavior, rowIndex } = row;
  const esql = behavior.validated_esql;
  if (!esql) {
    return null;
  }

  const executed = behavior.execution?.executed === true;
  const href = navigation.share
    ? buildDiscoverEsqlUrl({
        share: navigation.share,
        esql,
        timeRange: { from: timeRange.from, to: timeRange.to },
        useHash: true,
      })
    : undefined;
  // Share is wired but the redirect came back empty: the only reason the builder withholds a
  // hash URL is the 8192-char cap, so surface that rather than silently dropping the exit.
  const tooLong = Boolean(navigation.share) && !href;

  const copyLabel = i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.queryCopy', {
    defaultMessage: 'Copy query',
  });

  const openAria = executed
    ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.continueInDiscoverAria', {
        defaultMessage: 'Continue in Discover: {techniqueId} (behavior {position})',
        values: { techniqueId: behavior.technique_id, position: rowIndex + 1 },
      })
    : i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.openInDiscoverAria', {
        defaultMessage: 'Open in Discover: {techniqueId} (behavior {position})',
        values: { techniqueId: behavior.technique_id, position: rowIndex + 1 },
      });

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={esql}>
          {(copy) => (
            <EuiToolTip content={copyLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                size="xs"
                iconType="copy"
                onClick={copy}
                aria-label={copyLabel}
                data-test-subj={`alertzeroSignificantSecurityEventQueryCopy-${rowIndex}`}
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </EuiFlexItem>
      {href ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.continueTooltip',
              {
                defaultMessage: 'Opens with the hunt window {from} to {to}',
                values: { from: timeRange.from, to: timeRange.to },
              }
            )}
          >
            <EuiButtonIcon
              size="xs"
              iconType="discoverApp"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={openAria}
              data-test-subj={`alertzeroSignificantSecurityEventContinueInDiscover-${rowIndex}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      ) : tooLong ? (
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj={`alertzeroSignificantSecurityEventQueryTooLong-${rowIndex}`}
          >
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.queryTooLong', {
              defaultMessage: 'Query too long to open in Discover',
            })}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

/** Why a behavior never made the queries table: no query at all, or a query that will not run. */
const nonExecutableReason = (behavior: HuntResultBehavior): 'no_query' | 'not_runnable' =>
  behavior.validated_esql ? 'not_runnable' : 'no_query';

const QueriesRun: React.FC<{
  tier2: NonNullable<HuntResult['tier2']>;
  timeRange: HuntResult['time_range'];
  navigation: AttachmentNavigationDeps;
}> = ({ tier2, timeRange, navigation }) => {
  const rows: QueriesRunRow[] = tier2.behaviors
    .map((behavior, rowIndex) => ({ behavior, rowIndex }))
    .filter(
      ({ behavior }) =>
        behavior.validated_esql != null && isExecutableHuntQuery(behavior.validated_esql)
    );

  const nonExecutable = tier2.behaviors.filter(
    (behavior) => behavior.validated_esql == null || !isExecutableHuntQuery(behavior.validated_esql)
  );
  const noQueryCount = nonExecutable.filter(
    (behavior) => nonExecutableReason(behavior) === 'no_query'
  ).length;
  const notRunnableCount = nonExecutable.filter(
    (behavior) => nonExecutableReason(behavior) === 'not_runnable'
  ).length;

  const reasonParts: string[] = [];
  if (noQueryCount > 0) {
    reasonParts.push(
      i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.queriesRunNoQuery', {
        defaultMessage: '{count} with no query',
        values: { count: noQueryCount },
      })
    );
  }
  if (notRunnableCount > 0) {
    reasonParts.push(
      i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.queriesRunNotRunnable', {
        defaultMessage:
          '{count, plural, one {# with an unrunnable query} other {# with unrunnable queries}}',
        values: { count: notRunnableCount },
      })
    );
  }

  const columns: Array<EuiBasicTableColumn<QueriesRunRow>> = [
    {
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultFinding', {
        defaultMessage: 'Finding',
      }),
      render: ({ behavior }: QueriesRunRow) => (
        <EuiText size="xs" css={cellStyles}>
          <div>{behavior.title}</div>
          <EuiLink
            href={buildMitreTechniqueUrl(behavior.technique_id)}
            target="_blank"
            rel="noopener noreferrer"
            data-test-subj={`alertzeroSignificantSecurityEventHuntResultTechniqueLink-${behavior.technique_id}`}
          >
            {behavior.technique_id}
          </EuiLink>
          {behavior.tactic_ids.length > 0 ? (
            <EuiText size="xs" color="subdued" component="div">
              {behavior.tactic_ids.join(', ')}
            </EuiText>
          ) : null}
        </EuiText>
      ),
    },
    {
      name: i18n.translate(
        'xpack.alertzero.agentBuilder.attachments.sse.huntResultBehaviorResult',
        { defaultMessage: 'Result' }
      ),
      width: '10em',
      render: ({ behavior }: QueriesRunRow) => (
        <BehaviorExecutionCell execution={behavior.execution} />
      ),
    },
    {
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.queryReportMatch', {
        defaultMessage: 'Match',
      }),
      width: '5em',
      render: ({ behavior }: QueriesRunRow) => (
        <EuiText
          size="xs"
          css={css`
            font-variant-numeric: tabular-nums;
          `}
        >
          {formatPercent(behavior.confidence)}
        </EuiText>
      ),
    },
    {
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.behaviorActions', {
        defaultMessage: 'Actions',
      }),
      width: '5.5em',
      render: (row: QueriesRunRow) => (
        <QueryRowActions row={row} timeRange={timeRange} navigation={navigation} />
      ),
    },
  ];

  return (
    <>
      {tier2.behaviors_truncated ? (
        <>
          <PartialListNote
            label={PARTIAL_LIST_LABEL}
            testSubj="alertzeroSignificantSecurityEventHuntResultBehaviorsTruncated"
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      {rows.length > 0 ? (
        <EuiInMemoryTable<QueriesRunRow>
          compressed
          tableLayout="auto"
          responsiveBreakpoint={false}
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.sse.queriesRunTableCaption',
            { defaultMessage: 'Queries run for the hunted behaviors' }
          )}
          items={rows}
          columns={columns}
          pagination={
            rows.length > 5 ? { initialPageSize: 5, pageSizeOptions: [5, 10, 25] } : undefined
          }
        />
      ) : null}
      {reasonParts.length > 0 ? (
        <>
          {rows.length > 0 ? <EuiSpacer size="s" /> : null}
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="alertzeroSignificantSecurityEventQueriesRunNonExecutable"
          >
            <FormattedMessage
              id="xpack.alertzero.agentBuilder.attachments.sse.queriesRunNonExecutable"
              defaultMessage="{count, plural, one {# behavior not run} other {# behaviors not run}}: {reasons}"
              values={{ count: nonExecutable.length, reasons: reasonParts.join(', ') }}
            />
          </EuiText>
        </>
      ) : null}
    </>
  );
};

/** Sibling, default-collapsed section so detail never competes with the outcome summary. */
const DetailAccordion: React.FC<{
  id: string;
  testSubj: string;
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, testSubj, title, children }) => (
  <TableFrame>
    <EuiAccordion
      id={id}
      initialIsOpen={false}
      arrowDisplay="right"
      paddingSize="s"
      data-test-subj={testSubj}
      buttonProps={{ paddingSize: 's' }}
      buttonContent={
        <EuiTitle size="xxs">
          <h4>{title}</h4>
        </EuiTitle>
      }
    >
      {children}
    </EuiAccordion>
  </TableFrame>
);

/**
 * Per-index hit breakdown. Operational (which indices answered), not the attack story;
 * rendered above cited Events and Queries run.
 */
const IndexHits: React.FC<{ huntResult?: HuntResult }> = ({ huntResult }) => {
  const perIndex = huntResult?.tier1.per_index ?? [];
  if (perIndex.length === 0) {
    return null;
  }

  const distributionStats = perIndex.map((row, index) => ({
    key: row.index,
    count: row.hit_count,
    label: row.index,
    color: visColorAt(index),
    // Only required indices can corroborate: Tier 1's hit bar is computed from them, and an
    // optional index contributes hits that did not clear it. Unlabeled, its segment reads as
    // part of the corroborating total.
    required: row.required,
  }));
  const totalDistributedHits = distributionStats.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <Section
      testSubj={SSE_ATTACHMENT_INDEX_HITS_TEST_ID}
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.indexHits', {
        defaultMessage: 'Hits by index',
      })}
    >
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
                  {stat.required ? null : (
                    <>
                      {' '}
                      <EuiText size="xs" color="subdued" component="span">
                        {i18n.translate(
                          'xpack.alertzero.agentBuilder.attachments.sse.huntResultOptionalIndex',
                          { defaultMessage: 'optional' }
                        )}
                      </EuiText>
                    </>
                  )}
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
              values={{ hits: totalDistributedHits, indices: distributionStats.length }}
            />
            {huntResult?.tier1.per_index_truncated ? (
              <>
                {' · '}
                <PartialListNote
                  label={PARTIAL_BREAKDOWN_LABEL}
                  testSubj="alertzeroSignificantSecurityEventHuntResultPerIndexTruncated"
                />
              </>
            ) : null}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Section>
  );
};

/**
 * Who/what was involved (D3): host/user/service chips plus wide host and user counts.
 * Framed as part of the attack story so chips read as incident actors, not inventory.
 */
const EntityLine: React.FC<{
  entityLine: SseEntityLine;
  navigation: AttachmentNavigationDeps;
}> = ({ entityLine, navigation }) => {
  const { entities, hostCount, userCount } = entityLine;
  // The schema accepts 50 entities, so the overflow has to stay reachable.
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (entities.length === 0 && hostCount === 0 && userCount === 0) {
    return null;
  }

  const visibleEntities = isExpanded ? entities : entities.slice(0, ENTITY_CHIP_LIMIT);
  const hiddenCount = Math.max(entities.length - ENTITY_CHIP_LIMIT, 0);

  const countParts: string[] = [];
  if (hostCount > 0) {
    countParts.push(hostsLabel(hostCount));
  }
  if (userCount > 0) {
    countParts.push(usersLabel(userCount));
  }

  return (
    <Section
      testSubj={SSE_ATTACHMENT_ENTITY_LINE_TEST_ID}
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.involved', {
        defaultMessage: 'Involved',
      })}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        {entities.length > 0 ? (
          <EuiFlexItem grow={false}>
            <BadgeRow>
              {visibleEntities.map((entity, index) => (
                <EntityChip
                  key={`${entity.field}:${entity.value}:${index}`}
                  entity={entity}
                  share={navigation.share}
                  getUrlForApp={navigation.getUrlForApp}
                  testSubj={`alertzeroSignificantSecurityEventEntity-${index}`}
                />
              ))}
            </BadgeRow>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
            {countParts.length > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {countParts.join(' · ')}
                </EuiText>
              </EuiFlexItem>
            ) : null}
            {hiddenCount > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  iconType={isExpanded ? 'chevronSingleUp' : 'chevronSingleDown'}
                  onClick={() => setIsExpanded((expanded) => !expanded)}
                  data-test-subj="alertzeroSignificantSecurityEventEntitiesOverflow"
                >
                  {isExpanded
                    ? i18n.translate(
                        'xpack.alertzero.agentBuilder.attachments.sse.evidenceOverflowCollapse',
                        { defaultMessage: 'Show fewer' }
                      )
                    : i18n.translate(
                        'xpack.alertzero.agentBuilder.attachments.sse.evidenceOverflow',
                        {
                          defaultMessage: '+{hiddenCount} more',
                          values: { hiddenCount },
                        }
                      )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Section>
  );
};

/**
 * Which tiers cleared the bar, plus report-wide tier statuses. Lives in the status row
 * with Confirmed hit: `hit_sources` still names who confirmed when report-scoped Tier 1
 * status alone would misread a finding only Tier 2 corroborated.
 */
const HuntConfirmation: React.FC<{ huntResult: HuntResult }> = ({ huntResult }) => {
  const tier1 = huntResult.tier1;
  const tier2 = huntResult.tier2;
  if (!tier1) {
    return null;
  }

  const confirmingTiers = huntResult.hit_sources.map((source) => TIER_LABELS[source]);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      wrap={false}
      responsive={false}
      data-test-subj="alertzeroSignificantSecurityEventHuntResultOutcome"
    >
      {confirmingTiers.length > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            iconType="check"
            data-test-subj="alertzeroSignificantSecurityEventHuntResultHitSources"
          >
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntConfirmedBy', {
              defaultMessage: 'Confirmed by {tiers}',
              values: { tiers: confirmingTiers.join(', ') },
            })}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <EuiText size="xs" color="subdued" component="span">
            {TIER_LABELS.tier1}
          </EuiText>{' '}
          {TIER1_STATUS_LABELS[tier1.status]}
        </EuiBadge>
      </EuiFlexItem>
      {tier2?.status ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            <EuiText size="xs" color="subdued" component="span">
              {TIER_LABELS.tier2}
            </EuiText>{' '}
            {TIER2_STATUS_LABELS[tier2.status]}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

/**
 * IOCs Tier 1 queried (hits or not). Optional on the SSE copy (D5): when the producer
 * dropped the list, `searched_ioc_count` stands in for how many were searched.
 */
const SearchedFor: React.FC<{ huntResult: HuntResult | undefined }> = ({ huntResult }) => {
  const tier1 = huntResult?.tier1;
  if (!tier1) {
    return null;
  }

  const resolvedIocsByType = groupBy(tier1.resolved_iocs ?? [], (ioc) => ioc.type);
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
  const searchedIocCount = tier1.searched_ioc_count;
  if (resolvedIocRows.length === 0 && !(searchedIocCount != null && searchedIocCount > 0)) {
    return null;
  }

  const searchedForTitle = i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.searchedFor',
    { defaultMessage: 'Searched for' }
  );

  return (
    <div data-test-subj={SSE_ATTACHMENT_SEARCHED_FOR_TEST_ID}>
      {resolvedIocRows.length > 0 ? (
        <Section
          title={searchedForTitle}
          aside={
            tier1.resolved_iocs_truncated ? (
              <PartialListNote
                label={PARTIAL_LIST_LABEL}
                testSubj="alertzeroSignificantSecurityEventHuntResultResolvedIocsTruncated"
              />
            ) : undefined
          }
        >
          <LabeledBadgeTable
            rows={resolvedIocRows}
            testSubj="alertzeroSignificantSecurityEventHuntResultResolvedIocs"
            caption={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.searchedForTableCaption',
              { defaultMessage: 'IOCs the hunt searched for' }
            )}
          />
        </Section>
      ) : (
        <Section title={searchedForTitle}>
          <EuiText size="s" data-test-subj="alertzeroSignificantSecurityEventSearchedIocCount">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.searchedIocCount', {
              defaultMessage: 'Searched {count, plural, one {# IOC} other {# IOCs}}',
              values: { count: searchedIocCount },
            })}
          </EuiText>
        </Section>
      )}
    </div>
  );
};

/**
 * Run id linked to the workflow execution. Report id stays out; the chrome subtitle
 * already names the source report.
 */
const RunIdLink: React.FC<{
  parsed: SignificantSecurityEventAttachment['data'];
  navigation: AttachmentNavigationDeps;
}> = ({ parsed, navigation }) => {
  const runIdLabel = i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.runId', {
    defaultMessage: 'Run id',
  });
  const runHref = buildWorkflowExecutionUrl({
    getUrlForApp: navigation.getUrlForApp,
    workerId: parsed.source_watch,
    spaceId: navigation.spaceId,
    executionId: parsed.run_id,
  });
  const runIdValue = (
    <PlainValue
      value={parsed.run_id}
      testSubj="alertzeroSignificantSecurityEventRunId"
      maxCh={36}
    />
  );

  return (
    <div data-test-subj={SSE_ATTACHMENT_RUN_PROVENANCE_TEST_ID}>
      <EuiFlexGroup gutterSize="xs" alignItems="baseline" responsive={false}>
        <EuiFlexItem grow={false}>
          <InlineLabel>{runIdLabel}</InlineLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {runHref ? (
            <EuiLink
              href={runHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.sse.openRunExecutionAria',
                {
                  defaultMessage: 'Open workflow execution {runId}',
                  values: { runId: parsed.run_id },
                }
              )}
              data-test-subj="alertzeroSignificantSecurityEventRunLink"
            >
              {runIdValue}
            </EuiLink>
          ) : (
            runIdValue
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
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

  const events = parsed.events ?? [];
  const alerts = parsed.alerts ?? [];
  const huntResult = parsed.hunt_result;
  const tier2 = huntResult?.tier2;

  const viewModel = toSseViewModel(parsed);
  const { basis, detections, eventGroups, hypothesisDisplay, entityLine, summary } = viewModel;
  const basisBadge = basis ? basisHeaderBadge(basis) : undefined;

  const hasChromeHeader =
    buildSignificantSecurityEventActionButtons({ parsed, navigation }).length > 0;
  const storyEvidence = filterStoryEvidence({
    evidenceFor: parsed.evidence_for,
    evidenceAgainst: parsed.evidence_against,
    hasDetections: detections.length > 0,
  });
  const hasEvidence =
    storyEvidence.evidenceFor.length > 0 || storyEvidence.evidenceAgainst.length > 0;

  const statusRow = (
    <EuiFlexGroup
      alignItems="flexStart"
      gutterSize="s"
      responsive={false}
      data-test-subj="alertzeroSignificantSecurityEventStatusRow"
    >
      {/* Left: meta, tier pills, then run id. */}
      <EuiFlexItem grow={true} css={{ minWidth: 0 }}>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
              {!hasChromeHeader && basisBadge ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" data-test-subj={SSE_ATTACHMENT_BASIS_TEST_ID}>
                    {basisBadge.label}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {huntResult ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={huntResult.has_confirmed_hit ? 'danger' : 'hollow'}
                    data-test-subj="alertzeroSignificantSecurityEventConfirmedHit"
                  >
                    {huntResult.has_confirmed_hit
                      ? i18n.translate(
                          'xpack.alertzero.agentBuilder.attachments.sse.huntConfirmedHit',
                          { defaultMessage: 'Confirmed hit' }
                        )
                      : i18n.translate(
                          'xpack.alertzero.agentBuilder.attachments.sse.huntNoConfirmedHit',
                          { defaultMessage: 'No confirmed hit' }
                        )}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {parsed.severity}
                  {' · '}
                  {parsed.status}
                  {' · '}
                  {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.confidence', {
                    defaultMessage: '{confidence} confidence',
                    values: { confidence: formatPercent(parsed.confidence) },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {huntResult ? (
            <EuiFlexItem grow={false}>
              <HuntConfirmation huntResult={huntResult} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <RunIdLink parsed={parsed} navigation={navigation} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {huntResult ? (
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            css={{ whiteSpace: 'nowrap', textAlign: 'right' }}
            data-test-subj="alertzeroSignificantSecurityEventHuntWindow"
          >
            <DateTime value={huntResult.time_range.from} />
            {' – '}
            <DateTime value={huntResult.time_range.to} />
          </EuiText>
        </EuiFlexItem>
      ) : null}
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
        {/* Summary headline defers to the chrome header when one renders; severity / status /
            confidence are body content and always show. */}
        {/* Story: hypothesis → searched for → what matched → involved → dig in. */}
        {hasChromeHeader ? (
          statusRow
        ) : (
          <div data-test-subj={SSE_ATTACHMENT_HEADLINE_TEST_ID}>
            <EuiTitle size="xs">
              <h3 css={cellStyles}>{summary}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            {statusRow}
          </div>
        )}

        {hypothesisDisplay ? <HypothesisSection hypothesis={hypothesisDisplay} /> : null}

        <SearchedFor huntResult={huntResult} />

        {detections.length > 0 ? (
          <WhatMatched
            detections={detections}
            events={events}
            huntResult={huntResult}
            navigation={navigation}
          />
        ) : null}

        <EntityLine entityLine={entityLine} navigation={navigation} />

        {parsed.truncated ? (
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
        ) : null}

        {hasEvidence ? (
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            responsive={false}
            data-test-subj="alertzeroSignificantSecurityEventEvidence"
          >
            <EvidenceColumn
              label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceFor', {
                defaultMessage: 'Evidence for',
              })}
              iconType="check"
              iconColor="success"
              items={storyEvidence.evidenceFor}
            />
            <EvidenceColumn
              label={i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.sse.evidenceAgainst',
                { defaultMessage: 'Evidence against' }
              )}
              iconType="cross"
              iconColor="danger"
              items={storyEvidence.evidenceAgainst}
            />
          </EuiFlexGroup>
        ) : null}

        <IndexHits huntResult={huntResult} />

        {events.length > 0 || alerts.length > 0 ? (
          <DetailAccordion
            id={`alertzeroSignificantSecurityEventCitedEvidence-${attachment.id}`}
            testSubj="alertzeroSignificantSecurityEventCitedEvidence"
            title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.citedEvidence', {
              defaultMessage: `{eventCount, plural,
                =0 {{alertCount, plural, one {{alertCount, number} alert} other {{alertCount, number} alerts}}}
                one {{alertCount, plural,
                  =0 {{eventCount, number} event}
                  one {{eventCount, number} event, {alertCount, number} alert}
                  other {{eventCount, number} event, {alertCount, number} alerts}}}
                other {{alertCount, plural,
                  =0 {{eventCount, number} events}
                  one {{eventCount, number} events, {alertCount, number} alert}
                  other {{eventCount, number} events, {alertCount, number} alerts}}}
              }`,
              values: { eventCount: events.length, alertCount: alerts.length },
            })}
          >
            {eventGroups.length > 0 ? (
              <GroupedEvents eventGroups={eventGroups} navigation={navigation} />
            ) : null}
            {eventGroups.length > 0 && alerts.length > 0 ? <EuiSpacer size="m" /> : null}
            {alerts.length > 0 ? <AlertList alerts={alerts} navigation={navigation} /> : null}
          </DetailAccordion>
        ) : null}

        {huntResult && tier2 && tier2.behaviors.length > 0 ? (
          <DetailAccordion
            id={`alertzeroSignificantSecurityEventQueriesRun-${attachment.id}`}
            testSubj={SSE_ATTACHMENT_QUERIES_RUN_TEST_ID}
            title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.queriesRun', {
              defaultMessage: 'Queries run ({count})',
              values: {
                count: tier2.behaviors.filter(
                  (behavior) =>
                    behavior.validated_esql != null &&
                    isExecutableHuntQuery(behavior.validated_esql)
                ).length,
              },
            })}
          >
            <QueriesRun tier2={tier2} timeRange={huntResult.time_range} navigation={navigation} />
          </DetailAccordion>
        ) : null}
      </SectionStack>
    </EuiPanel>
  );
};

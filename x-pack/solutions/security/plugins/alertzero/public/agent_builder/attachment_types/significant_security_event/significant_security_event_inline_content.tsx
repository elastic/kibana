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
import { buildAlertDetailsUrl, buildDiscoverEsqlUrl, buildEventLookupEsql } from '../navigation';
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
  MetaCard,
  TableFrame,
  AttachmentEmptyState,
  buildMitreTechniqueUrl,
} from '../shared/primitives';
import { LabeledBadgeTable, type LabeledBadgeTableRow } from '../shared/labeled_badge_table';
import { formatPercent, severityBadgeColor } from '../shared/severity';
import {
  buildSignificantSecurityEventActionButtons,
  parseSignificantSecurityEventData,
} from './view_model';
import type {
  HuntResult,
  HuntResultBehavior,
  HuntResultBehaviorExecution,
  SignificantSecurityAlertRef,
  SignificantSecurityEventAttachment,
  SignificantSecurityEventRef,
  SecurityKnowledgeIndicator,
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
              ? {
                  href: mitreUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  iconType: 'external',
                }
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
      defaultMessage: 'Why this matters',
    })}
  >
    <EuiText size="s" data-test-subj="alertzeroSignificantSecurityEventHypothesis">
      <p css={[cellStyles, { margin: 0 }]}>{hypothesis}</p>
    </EuiText>
  </Section>
);

interface Tier2TableRow {
  technique_id: string;
  tactic_ids: string[];
  confidence: number;
  title: string;
  execution?: HuntResultBehaviorExecution;
  validated_esql?: string;
  /** Index in `tier2.behaviors`, which names the row for assistive tech. */
  rowIndex: number;
}

/**
 * What the behavior's query actually found, which the rest of the row does not say: technique,
 * rule and confidence describe the proposal, not its result. Four outcomes read identically
 * without it — an executed hit, an executed clean run, a proposal that never ran, and a run
 * whose rows could not be classified — and only the second is evidence of a clean environment.
 *
 * An absent `execution` is left blank rather than labeled: the producer reported no result,
 * which is not the same as reporting that nothing ran.
 */
const BehaviorExecutionCell: React.FC<{ execution?: HuntResultBehaviorExecution }> = ({
  execution,
}) => {
  if (!execution) {
    return null;
  }

  if (!execution.executed) {
    return (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.behaviorNotExecuted', {
          defaultMessage: 'Not executed',
        })}
      </EuiBadge>
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

/**
 * Opens the exact query a Tier 2 behavior ran in Discover, over the hunt window. Shown only for
 * an execution that ran, so a proposal that never executed does not claim to continue a hunt;
 * an executed run with no rows still qualifies, because the analyst can widen it and look.
 */
const ContinueInDiscoverAction: React.FC<{
  row: Tier2TableRow;
  timeRange: HuntResult['time_range'];
  navigation: AttachmentNavigationDeps;
}> = ({ row, timeRange, navigation }) => {
  if (row.execution?.executed !== true || !row.validated_esql) {
    return null;
  }

  const href = buildDiscoverEsqlUrl({
    share: navigation.share,
    esql: row.validated_esql,
    timeRange: { from: timeRange.from, to: timeRange.to },
    useHash: true,
  });
  if (!href) {
    return null;
  }

  return (
    <EuiToolTip
      content={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.continueTooltip', {
        defaultMessage: 'Opens with the hunt window {from} to {to}',
        values: { from: timeRange.from, to: timeRange.to },
      })}
    >
      <EuiButtonEmpty
        size="xs"
        iconType="external"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={i18n.translate(
          'xpack.alertzero.agentBuilder.attachments.sse.continueInDiscoverAria',
          {
            defaultMessage: 'Continue in Discover: {techniqueId} (behavior {position})',
            values: { techniqueId: row.technique_id, position: row.rowIndex + 1 },
          }
        )}
        data-test-subj={`alertzeroSignificantSecurityEventContinueInDiscover-${row.rowIndex}`}
      >
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.continueInDiscover', {
          defaultMessage: 'Continue in Discover',
        })}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};

const BehaviorValidation: React.FC<{
  tier2: NonNullable<HuntResult['tier2']>;
  timeRange: HuntResult['time_range'];
  navigation: AttachmentNavigationDeps;
}> = ({ tier2, timeRange, navigation }) => {
  const { euiTheme } = useEuiTheme();

  const rows: Tier2TableRow[] = tier2.behaviors.map((behavior, rowIndex) => ({
    technique_id: behavior.technique_id,
    tactic_ids: behavior.tactic_ids,
    confidence: behavior.confidence,
    title: behavior.title,
    rowIndex,
    ...(behavior.execution ? { execution: behavior.execution } : {}),
    ...(behavior.validated_esql ? { validated_esql: behavior.validated_esql } : {}),
  }));

  const columns: Array<EuiBasicTableColumn<Tier2TableRow>> = [
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
      field: 'title',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultFinding', {
        defaultMessage: 'Finding',
      }),
      render: (title: string) => (
        <EuiText size="xs" css={cellStyles}>
          {title}
        </EuiText>
      ),
    },
    {
      field: 'tactic_ids',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultTactics', {
        defaultMessage: 'Tactics',
      }),
      render: (tacticIds: string[]) => <HollowBadgeList items={tacticIds} />,
    },
    {
      field: 'execution',
      name: i18n.translate(
        'xpack.alertzero.agentBuilder.attachments.sse.huntResultBehaviorResult',
        {
          defaultMessage: 'Result',
        }
      ),
      render: (execution: Tier2TableRow['execution']) => (
        <BehaviorExecutionCell execution={execution} />
      ),
    },
    {
      field: 'confidence',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultConfidence', {
        defaultMessage: 'Confidence',
      }),
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
    {
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.behaviorActions', {
        defaultMessage: 'Actions',
      }),
      render: (row: Tier2TableRow) => (
        <ContinueInDiscoverAction row={row} timeRange={timeRange} navigation={navigation} />
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
      <EuiInMemoryTable<Tier2TableRow>
        compressed
        tableLayout="auto"
        responsiveBreakpoint={false}
        rowHeader="technique_id"
        tableCaption={i18n.translate(
          'xpack.alertzero.agentBuilder.attachments.sse.huntResultBehaviorsTableCaption',
          { defaultMessage: 'Hunt result behaviors' }
        )}
        items={rows}
        columns={columns}
        pagination={
          rows.length > 5 ? { initialPageSize: 5, pageSizeOptions: [5, 10, 25] } : undefined
        }
      />
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

const TwoLineCaption: React.FC<{ primary: React.ReactNode; secondary?: React.ReactNode }> = ({
  primary,
  secondary,
}) => (
  <>
    <EuiText size="xs" color="subdued">
      {primary}
    </EuiText>
    {secondary ? (
      <EuiText size="xs" color="subdued">
        {secondary}
      </EuiText>
    ) : null}
  </>
);

/**
 * Distinct Tier 2 names across the behaviors that hit, and whether any contributing behavior
 * capped its list. Only behaviors that actually listed names count as contributing: the fields
 * are optional, so an absent list is unknown and never zero.
 */
const collectTier2Names = (
  hitBehaviors: HuntResultBehavior[],
  field: 'affected_hosts' | 'affected_users'
): { count: number; truncated: boolean } => {
  const names = new Set<string>();
  let truncated = false;
  for (const behavior of hitBehaviors) {
    const list = behavior[field] ?? [];
    if (list.length === 0) {
      continue;
    }
    list.forEach((name) => names.add(name));
    if (behavior[`${field}_truncated`] === true) {
      truncated = true;
    }
  }
  return { count: names.size, truncated };
};

const NO_VALUE = '–';

const AffectedStat: React.FC<{
  field: 'affected_hosts' | 'affected_users';
  label: string;
  huntResult: HuntResult;
  hitBehaviors: HuntResultBehavior[];
}> = ({ field, label, huntResult, hitBehaviors }) => {
  const { tier1 } = huntResult;
  const tier2Names = collectTier2Names(hitBehaviors, field);
  const tier2Total = `${tier2Names.count}${tier2Names.truncated ? '+' : ''}`;

  // Tier 1 reports only counts, so its number and Tier 2's names may overlap and are never
  // added into one figure.
  if (tier1.status === 'environment_hits_found') {
    return (
      <CompactStat
        emphasis="strong"
        title={tier1.counts[field]}
        description={
          <TwoLineCaption
            primary={label}
            secondary={
              tier2Names.count > 0
                ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.tier2AlsoReports', {
                    defaultMessage: 'Tier 2 also reports {total}',
                    values: { total: tier2Total },
                  })
                : undefined
            }
          />
        }
      />
    );
  }

  // Unknown is not zero: only a clean Tier 1 with no Tier 2 hit is evidence of none.
  const title =
    hitBehaviors.length > 0
      ? tier2Names.count > 0
        ? tier2Total
        : NO_VALUE
      : tier1.status === 'no_environment_hits'
      ? 0
      : NO_VALUE;

  return <CompactStat emphasis="strong" title={title} description={label} />;
};

const OutcomeStats: React.FC<{
  huntResult?: HuntResult;
  citedReferenceCount: number;
}> = ({ huntResult, citedReferenceCount }) => {
  const citedStat = (
    <CompactStat
      emphasis="strong"
      title={citedReferenceCount}
      description={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.citedReferences', {
        defaultMessage: 'Cited references',
      })}
    />
  );

  // Without a hunt result the card cannot know hits, hosts or users, and zeros would read as a
  // clean environment.
  if (!huntResult) {
    return <StatRow>{citedStat}</StatRow>;
  }

  const { tier1, tier2 } = huntResult;
  const hitBehaviors = (tier2?.behaviors ?? []).filter(
    (behavior) => behavior.execution?.hit === true
  );
  const isSampled = tier1.counts.returned_hits < tier1.counts.total_hits;
  const didNotSearch = tier1.status === 'scope_blocked' || tier1.status === 'no_searchable_terms';

  const hitsTitle = didNotSearch
    ? NO_VALUE
    : isSampled
    ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntResultReturnedOfTotal', {
        defaultMessage: '{returned} of {total}',
        values: { returned: tier1.counts.returned_hits, total: tier1.counts.total_hits },
      })
    : tier1.counts.total_hits;
  const hitsPrimary = didNotSearch
    ? TIER1_STATUS_LABELS[tier1.status]
    : isSampled
    ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.environmentHitsSampled', {
        defaultMessage: 'Environment hits (sampled)',
      })
    : i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.environmentHits', {
        defaultMessage: 'Environment hits',
      });

  return (
    <StatRow>
      <CompactStat
        emphasis="strong"
        title={hitsTitle}
        description={
          <TwoLineCaption
            primary={hitsPrimary}
            secondary={
              hitBehaviors.length > 0
                ? i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.behaviorHitsCaption',
                    {
                      defaultMessage:
                        '+ {count} {count, plural, one {behavior hit} other {behavior hits}}',
                      values: { count: hitBehaviors.length },
                    }
                  )
                : undefined
            }
          />
        }
      />
      <AffectedStat
        field="affected_hosts"
        label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.affectedHosts', {
          defaultMessage: 'Affected hosts',
        })}
        huntResult={huntResult}
        hitBehaviors={hitBehaviors}
      />
      <AffectedStat
        field="affected_users"
        label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.affectedUsers', {
          defaultMessage: 'Affected users',
        })}
        huntResult={huntResult}
        hitBehaviors={hitBehaviors}
      />
      {citedStat}
    </StatRow>
  );
};

const ENTITY_CHIP_LIMIT = 10;

const EntitiesSection: React.FC<{
  entities: SignificantSecurityEventAttachment['data']['entities'];
  navigation: AttachmentNavigationDeps;
}> = ({ entities, navigation }) => {
  // The schema accepts 50 entities, so the overflow has to stay reachable.
  const [isExpanded, setIsExpanded] = React.useState(false);
  const visibleEntities = isExpanded ? entities : entities.slice(0, ENTITY_CHIP_LIMIT);
  const hiddenCount = Math.max(entities.length - ENTITY_CHIP_LIMIT, 0);

  return (
    <Section
      title={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entities', {
        defaultMessage: 'Entities',
      })}
      aside={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entitiesCount', {
            defaultMessage: '{count, plural, one {# entity} other {# entities}}',
            values: { count: entities.length },
          })}
        </EuiText>
      }
    >
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
      {hiddenCount > 0 && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          data-test-subj="alertzeroSignificantSecurityEventEntitiesOverflow"
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
      )}
    </Section>
  );
};

/** Hunt-run mechanics for the analyst who needs to audit how the finding was reached. */
const TechnicalRunDetails: React.FC<{
  parsed: SignificantSecurityEventAttachment['data'];
}> = ({ parsed }) => {
  const huntResult = parsed.hunt_result;
  const hasEvidence = parsed.evidence_for.length > 0 || parsed.evidence_against.length > 0;

  const metaCards: Array<{ label: string; value: string; testSubj: string }> = [
    {
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.runId', {
        defaultMessage: 'Run id',
      }),
      value: parsed.run_id,
      testSubj: 'alertzeroSignificantSecurityEventRunId',
    },
    {
      // No Discover action: a raw ES|QL lookup against the hidden `.kibana-threat-reports*`
      // index is unreachable for a non-superuser. See elastic/security-team#19733.
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.sourceReport', {
        defaultMessage: 'Source report',
      }),
      value: parsed.report_id,
      testSubj: 'alertzeroSignificantSecurityEventReportLink',
    },
    {
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.sourceWatch', {
        defaultMessage: 'Source watch',
      }),
      value: parsed.source_watch,
      testSubj: 'alertzeroSignificantSecurityEventSourceWatch',
    },
    {
      label: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.capability', {
        defaultMessage: 'Capability',
      }),
      value: parsed.capability,
      testSubj: 'alertzeroSignificantSecurityEventCapability',
    },
  ];

  const tier1 = huntResult?.tier1;
  const tier2 = huntResult?.tier2;
  const confirmingTiers = huntResult?.hit_sources.map((source) => TIER_LABELS[source]) ?? [];
  const distributionStats =
    tier1?.per_index.map((row, index) => ({
      key: row.index,
      count: row.hit_count,
      label: row.index,
      color: visColorAt(index),
      // Only required indices can corroborate: Tier 1's hit bar is computed from them, and an
      // optional index contributes hits that did not clear it. Unlabeled, its segment reads as
      // part of the corroborating total.
      required: row.required,
    })) ?? [];
  const totalDistributedHits = distributionStats.reduce((sum, stat) => sum + stat.count, 0);

  // `resolved_iocs` are the concrete indicators that produced the hit counts, so they belong on
  // the analyst-facing card and not only in the agent representation.
  const resolvedIocsByType = groupBy(tier1?.resolved_iocs ?? [], (ioc) => ioc.type);
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

  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          {metaCards.map(({ label, value, testSubj }) => (
            <EuiFlexItem key={testSubj} css={{ minWidth: 200 }}>
              <MetaCard label={label}>
                <IocBadge value={value} testSubj={testSubj} />
              </MetaCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>

      {huntResult && tier1 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="xs"
            wrap
            responsive={false}
            data-test-subj="alertzeroSignificantSecurityEventHuntResultOutcome"
          >
            {/* Which tier cleared the bar for this finding, which the tier statuses beside it
                do not say: a report-scoped entry carries its report's Tier 1 status, so
                "Tier 1 Environment hits found" can sit beside a finding only Tier 2
                corroborated and read as its confirmation. */}
            {confirmingTiers.length > 0 && (
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
            )}
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                <EuiText size="xs" color="subdued" component="span">
                  {TIER_LABELS.tier1}
                </EuiText>{' '}
                {TIER1_STATUS_LABELS[tier1.status]}
              </EuiBadge>
            </EuiFlexItem>
            {tier2?.status && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  <EuiText size="xs" color="subdued" component="span">
                    {TIER_LABELS.tier2}
                  </EuiText>{' '}
                  {TIER2_STATUS_LABELS[tier2.status]}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {distributionStats.length > 0 && (
        <EuiFlexItem grow={false}>
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
                {tier1?.per_index_truncated ? (
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
        </EuiFlexItem>
      )}

      {resolvedIocRows.length > 0 && (
        <EuiFlexItem grow={false}>
          <Section
            title={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.huntResultResolvedIocs',
              { defaultMessage: 'Resolved IOCs' }
            )}
            aside={
              tier1?.resolved_iocs_truncated ? (
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
                'xpack.alertzero.agentBuilder.attachments.sse.huntResultResolvedIocsTableCaption',
                { defaultMessage: 'Resolved IOCs for the hunt result' }
              )}
            />
          </Section>
        </EuiFlexItem>
      )}

      {hasEvidence && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
            <EvidenceColumn
              label={i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceFor', {
                defaultMessage: 'Evidence for',
              })}
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
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
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

  const hasChromeHeader =
    buildSignificantSecurityEventActionButtons({ parsed, navigation }).length > 0;

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
      {huntResult && (
        <>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={huntResult.has_confirmed_hit ? 'danger' : 'hollow'}
              data-test-subj="alertzeroSignificantSecurityEventConfirmedHit"
            >
              {huntResult.has_confirmed_hit
                ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.huntConfirmedHit', {
                    defaultMessage: 'Confirmed hit',
                  })
                : i18n.translate(
                    'xpack.alertzero.agentBuilder.attachments.sse.huntNoConfirmedHit',
                    {
                      defaultMessage: 'No confirmed hit',
                    }
                  )}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              size="xs"
              color="subdued"
              css={{ whiteSpace: 'nowrap' }}
              data-test-subj="alertzeroSignificantSecurityEventHuntWindow"
            >
              <DateTime value={huntResult.time_range.from} />
              {' – '}
              <DateTime value={huntResult.time_range.to} />
            </EuiText>
          </EuiFlexItem>
        </>
      )}
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

        <EuiPanel
          hasShadow={false}
          hasBorder
          paddingSize="m"
          data-test-subj="alertzeroSignificantSecurityEventOutcome"
        >
          <OutcomeStats
            huntResult={huntResult}
            citedReferenceCount={events.length + alerts.length}
          />
        </EuiPanel>

        {parsed.hypothesis_tested && <HypothesisSection hypothesis={parsed.hypothesis_tested} />}

        {parsed.security_knowledge_indicators.length > 0 && (
          <IndicatorList indicators={parsed.security_knowledge_indicators} />
        )}

        {parsed.entities.length > 0 && (
          <EntitiesSection entities={parsed.entities} navigation={navigation} />
        )}

        {(events.length > 0 || alerts.length > 0) && (
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
            {events.length > 0 && <EventRows events={events} navigation={navigation} />}
            {events.length > 0 && alerts.length > 0 && <EuiSpacer size="m" />}
            {alerts.length > 0 && <AlertList alerts={alerts} navigation={navigation} />}
          </DetailAccordion>
        )}

        {huntResult && tier2 && tier2.behaviors.length > 0 && (
          <DetailAccordion
            id={`alertzeroSignificantSecurityEventBehaviorValidation-${attachment.id}`}
            testSubj="alertzeroSignificantSecurityEventBehaviorValidation"
            title={i18n.translate(
              'xpack.alertzero.agentBuilder.attachments.sse.behaviorValidation',
              {
                defaultMessage: 'Behavior validation ({count})',
                values: { count: tier2.behaviors.length },
              }
            )}
          >
            <BehaviorValidation
              tier2={tier2}
              timeRange={huntResult.time_range}
              navigation={navigation}
            />
          </DetailAccordion>
        )}

        <DetailAccordion
          id={`alertzeroSignificantSecurityEventTechnicalRunDetails-${attachment.id}`}
          testSubj="alertzeroSignificantSecurityEventTechnicalRunDetails"
          title={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.sse.technicalRunDetails',
            {
              defaultMessage: 'Technical run details',
            }
          )}
        >
          <TechnicalRunDetails parsed={parsed} />
        </DetailAccordion>
      </SectionStack>
    </EuiPanel>
  );
};

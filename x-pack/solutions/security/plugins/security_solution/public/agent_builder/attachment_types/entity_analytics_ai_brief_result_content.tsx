/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { RiskScoreHistoryEntry } from '../../../common/api/entity_analytics/risk_engine/risk_score_history_route.gen';
import { BriefViewModel } from '../../../common/entity_analytics/ai_brief/result';
import type { EntityAnalyticsAiBriefResult } from '../../../common/entity_analytics/ai_brief/result';
import { RiskScoreTimelineChart } from '../../entity_analytics/components/risk_score_timeline';
import { getRiskScoreColors } from '../../entity_analytics/components/home/entities_table/risk_score_cell';

const unavailableMessage = i18n.translate(
  'xpack.securitySolution.agentBuilder.aiBrief.unavailable',
  { defaultMessage: 'This brief is unavailable because its stored data is invalid or unsupported.' }
);
const countFormat = new Intl.NumberFormat();
const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
const numberFontSize = 36;

const entityTypeLabel = (
  type: EntityAnalyticsAiBriefResult['data']['priorities'][number]['type']
): string => {
  const messages = {
    host: i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.entityType.host', {
      defaultMessage: 'Host',
    }),
    user: i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.entityType.user', {
      defaultMessage: 'User',
    }),
    service: i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.entityType.service', {
      defaultMessage: 'Service',
    }),
    generic: i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.entityType.generic', {
      defaultMessage: 'Generic',
    }),
  };
  return messages[type];
};

type BriefPriority = EntityAnalyticsAiBriefResult['data']['priorities'][number];

const CountValue: React.FC<{ value: number }> = ({ value }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      css={css`
        font-family: 'Elastic UI Numeric', ${euiTheme.font.family};
        font-size: ${numberFontSize}px;
        font-weight: ${euiTheme.font.weight.bold};
        line-height: 1.2;
        color: ${euiTheme.colors.textParagraph};
        overflow-wrap: anywhere;
      `}
    >
      {value === 0 ? '—' : countFormat.format(value)}
    </EuiText>
  );
};

export const EntityAnalyticsAiBriefResultContent: React.FC<
  AttachmentRenderProps<EntityAnalyticsAiBriefResult> & {
    onOpenEntity?: (priority: BriefPriority) => void;
  }
> = ({ attachment, onOpenEntity }) => {
  const componentId = React.useId();
  const parsed = BriefViewModel.safeParse(attachment.data);
  if (!parsed.success) {
    return <KbnWarningCallout title={unavailableMessage} />;
  }

  const brief = parsed.data;
  const shownCounts = brief.counts.filter(({ value, delta }) => value > 0 || (delta ?? 0) !== 0);
  const title =
    brief.title ??
    (brief.summary === 'Nothing in this view is flagged as needing attention.'
      ? i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.quietTitle', {
          defaultMessage: 'All clear: nothing needs immediate attention',
        })
      : i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.noPrioritiesTitle', {
          defaultMessage: 'Nothing to prioritize right now',
        }));
  const scopeFacts = [
    i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.generated', {
      defaultMessage: 'Generated {time} UTC',
      values: { time: dateFormat.format(new Date(brief.scope.capturedAt)) },
    }),
    i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.timeRange', {
      defaultMessage: 'Last {period}',
      values: { period: brief.scope.periodLabel },
    }),
    ...brief.scope.entityFilters.map(({ label, value }) => `${label}: ${value}`),
    brief.scope.focusTileTitle &&
      i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.focusTile', {
        defaultMessage: 'Attention tile: {title}',
        values: { title: brief.scope.focusTileTitle },
      }),
    brief.scope.spaceId !== DEFAULT_SPACE_ID &&
      i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.space', {
        defaultMessage: 'Space: {spaceId}',
        values: { spaceId: brief.scope.spaceId },
      }),
  ].filter((value): value is string => Boolean(value));
  const coverage = [
    brief.scope.sample,
    brief.notChecked.notFound,
    brief.notChecked.unreadable.length > 0 &&
      i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.notIncluded', {
        defaultMessage: 'Not included: {items} (data could not be loaded)',
        values: { items: brief.notChecked.unreadable.join(', ') },
      }),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <section aria-labelledby={`${componentId}-scope`}>
        <EuiTitle size="xs">
          <h3 id={`${componentId}-scope`}>
            {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.scope', {
              defaultMessage: 'Scope',
            })}
          </h3>
        </EuiTitle>
        <EuiText
          size="s"
          css={css`
            min-width: 0;
            overflow-wrap: anywhere;
          `}
        >
          <p>{scopeFacts.join(' · ')}</p>
        </EuiText>
        {coverage && (
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.coverage', {
              defaultMessage: 'Coverage',
            })}
          >
            {coverage}
          </KbnWarningCallout>
        )}
      </section>

      {brief.summary && (
        <section aria-labelledby={`${componentId}-assessment`}>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3 id={`${componentId}-assessment`}>
              {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.whatNeedsAttention', {
                defaultMessage: 'What needs attention',
              })}
            </h3>
          </EuiTitle>
          <EuiText>
            <p>{brief.summary}</p>
          </EuiText>
        </section>
      )}

      {shownCounts.length > 0 && (
        <section aria-labelledby={`${componentId}-counts`}>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3 id={`${componentId}-counts`}>
              {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.periodAtGlance', {
                defaultMessage: 'This period at a glance',
              })}{' '}
              <EuiText size="s" color="subdued" component="span">
                {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.vsPreviousPeriod', {
                  defaultMessage: 'vs previous {period}',
                  values: { period: brief.scope.periodLabel },
                })}
              </EuiText>
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup responsive={false} wrap gutterSize="m">
              {shownCounts.map(({ tileId, title: countTitle, description, value, delta }) => (
                <EuiFlexItem
                  key={tileId}
                  grow={false}
                  css={css`
                    min-width: 0;
                    max-width: 100%;
                    overflow-wrap: anywhere;
                  `}
                >
                  <EuiText size="s">
                    <strong>{countTitle}</strong>
                  </EuiText>
                  {description && <EuiText size="xs">{description}</EuiText>}
                  <CountValue value={value} />
                  <EuiText size="xs">
                    {delta === undefined
                      ? i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.noComparison', {
                          defaultMessage: 'No comparison',
                        })
                      : delta === 0
                      ? i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.noChange', {
                          defaultMessage: 'No change',
                        })
                      : i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.change', {
                          defaultMessage: '{sign}{value} {direction}',
                          values: {
                            sign: delta > 0 ? '+' : '−',
                            value: countFormat.format(Math.abs(delta)),
                            direction: delta > 0 ? '↑' : '↓',
                          },
                        })}
                  </EuiText>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </section>
      )}

      {brief.recommendation && (
        <section aria-labelledby={`${componentId}-recommendation`}>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3 id={`${componentId}-recommendation`}>
              {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.recommendation', {
                defaultMessage: 'Recommended next step',
              })}
            </h3>
          </EuiTitle>
          <EuiText>
            <p>{brief.recommendation}</p>
          </EuiText>
        </section>
      )}

      {(brief.priorities.length > 0 || !brief.summary) && (
        <section aria-labelledby={`${componentId}-priorities`}>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3 id={`${componentId}-priorities`}>
              {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.entitiesToInvestigate', {
                defaultMessage: 'Entities to investigate first',
              })}
            </h3>
          </EuiTitle>
          {brief.priorities.length === 0 ? (
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.noPriorities', {
                  defaultMessage: 'No entity in this view has enough evidence to prioritize.',
                })}
              </p>
            </EuiText>
          ) : (
            <ol>
              {brief.priorities.map((priority) => (
                <li key={priority.entityId}>
                  <EuiPanel
                    hasBorder
                    paddingSize="m"
                    css={css`
                      min-width: 0;
                      max-width: 100%;
                      overflow-wrap: anywhere;
                    `}
                  >
                    <PriorityContent
                      priority={priority}
                      onOpenEntity={onOpenEntity}
                      periodLabel={brief.scope.periodLabel}
                    />
                  </EuiPanel>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </EuiPanel>
  );
};

const PriorityContent: React.FC<{
  priority: BriefPriority;
  onOpenEntity?: (priority: BriefPriority) => void;
  periodLabel: string;
}> = ({ priority, onOpenEntity, periodLabel }) => {
  const { euiTheme } = useEuiTheme();
  const riskColors = priority.risk && getRiskScoreColors(euiTheme, priority.risk.level);
  const riskLabel =
    priority.risk &&
    i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.risk', {
      defaultMessage: 'Risk: {level}, {score}{group}',
      values: {
        level: priority.risk.level,
        score: countFormat.format(priority.risk.score),
        group:
          priority.risk.of === 'resolution group'
            ? i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.resolutionGroup', {
                defaultMessage: ', resolution group',
              })
            : '',
      },
    });
  const firstSeenAndWatchlists = [
    priority.firstSeen &&
      i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.firstSeen', {
        defaultMessage: 'First seen: {time}',
        values: { time: priority.firstSeen },
      }),
    priority.watchlists.length > 0 &&
      i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.watchlists', {
        defaultMessage: 'Watchlists: {names}',
        values: { names: priority.watchlists.join(', ') },
      }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <EuiFlexGroup
        responsive={false}
        wrap
        gutterSize="s"
        alignItems="center"
        css={css`
          min-width: 0;
          max-width: 100%;
          align-items: flex-start;
        `}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 0;
            max-width: 100%;
            overflow-wrap: anywhere;
            flex: 1 1 auto;
          `}
        >
          {onOpenEntity && priority.type !== 'generic' ? (
            <EuiButtonEmpty
              size="s"
              flush="left"
              onClick={() => onOpenEntity(priority)}
              css={css`
                max-width: 100%;
                white-space: normal;
                text-align: left;
                overflow-wrap: anywhere;
              `}
            >
              {priority.name}
            </EuiButtonEmpty>
          ) : (
            <EuiText>
              <strong>{priority.name}</strong>
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            max-width: 100%;
          `}
        >
          <EuiBadge
            css={css`
              max-width: 100%;
              white-space: normal;
              overflow-wrap: anywhere;
            `}
          >
            {entityTypeLabel(priority.type)}
          </EuiBadge>
        </EuiFlexItem>
        {priority.risk && riskColors && riskLabel && (
          <EuiFlexItem
            grow={false}
            css={css`
              max-width: 100%;
            `}
          >
            <span
              css={css`
                max-width: 100%;
                white-space: normal;
                overflow-wrap: anywhere;
              `}
              aria-label={riskLabel}
              style={{
                backgroundColor: riskColors.background,
                color: riskColors.text,
                borderRadius: euiTheme.border.radius.small,
                display: 'inline-block',
                fontSize: `${euiTheme.font.scale.xs}rem`,
                fontWeight: euiTheme.font.weight.semiBold,
                lineHeight: 1.4,
                padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
              }}
            >
              {riskLabel}
            </span>
          </EuiFlexItem>
        )}
        {priority.assetCriticality && (
          <EuiFlexItem
            grow={false}
            css={css`
              max-width: 100%;
            `}
          >
            <EuiBadge
              css={css`
                max-width: 100%;
                white-space: normal;
                overflow-wrap: anywhere;
              `}
            >
              {priority.assetCriticality.replaceAll('_', ' ')}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {firstSeenAndWatchlists && <EuiText size="xs">{firstSeenAndWatchlists}</EuiText>}
      <EuiSpacer size="s" />
      <PriorityFact
        title={i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.evidence', {
          defaultMessage: 'Evidence',
        })}
        value={priority.assessment}
      />
      <PriorityFact
        title={i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.whyPrioritized', {
          defaultMessage: 'Why prioritized',
        })}
        value={priority.whyFirst}
      />
      <PriorityFact
        title={i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.nextStep', {
          defaultMessage: 'Next step',
        })}
        value={priority.nextStep}
      />
      {priority.riskHistory && priority.riskHistory.points.length >= 2 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.riskHistoryRange', {
              defaultMessage: 'Risk score, last {period}, {entityType}, {from} to {to}',
              values: {
                period: periodLabel,
                entityType:
                  priority.riskHistory.of === 'resolution group'
                    ? i18n.translate(
                        'xpack.securitySolution.agentBuilder.aiBrief.resolutionGroupName',
                        { defaultMessage: 'resolution group' }
                      )
                    : i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.entity', {
                        defaultMessage: 'entity',
                      }),
                from: dateFormat.format(new Date(priority.riskHistory.from)),
                to: dateFormat.format(new Date(priority.riskHistory.to)),
              },
            })}
          </EuiText>
          <RiskScoreTimelineChart
            entries={priority.riskHistory.points.map(({ t, score, level }) =>
              RiskScoreHistoryEntry.parse({
                '@timestamp': t,
                calculated_score_norm: score,
                calculated_level: level,
              })
            )}
            isLoading={false}
            isError={false}
            from={priority.riskHistory.from}
            to={priority.riskHistory.to}
            onPointSelect={() => undefined}
          />
        </>
      )}
      <EuiText size="xs">
        <p>
          {i18n.translate('xpack.securitySolution.agentBuilder.aiBrief.currentDetails', {
            defaultMessage:
              'Investigating a priority opens its current details, not this captured brief.',
          })}
        </p>
      </EuiText>
    </>
  );
};

const PriorityFact: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <EuiText size="s">
    <p>
      <strong>
        {title}
        {':'}
      </strong>{' '}
      {value}
    </p>
  </EuiText>
);

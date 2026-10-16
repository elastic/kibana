/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { IEventReaction } from './event_reaction';
import { formatDuration, formatTime } from './format';

interface IMilestone {
  id: string;
  label: string;
  at?: number;
  /** What happens between the previous milestone and this one. */
  gapHelp: string;
}

function buildMilestones(reaction: IEventReaction): IMilestone[] {
  const milestones: IMilestone[] = [
    {
      id: 'started',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.started', {
        defaultMessage: 'Problem started',
      }),
      at: reaction.startedAt,
      gapHelp: '',
    },
    {
      id: 'minuteEnd',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.minuteEnd', {
        defaultMessage: 'Minute complete',
      }),
      at: reaction.minuteEndAt,
      gapHelp: i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.minuteHelp', {
        defaultMessage: 'Data is counted per minute, so a minute is judged once it is over.',
      }),
    },
  ];
  if (reaction.runStartedAt !== undefined) {
    milestones.push({
      id: 'run',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.run', {
        defaultMessage: 'Engine picked it up',
      }),
      at: reaction.runStartedAt,
      gapHelp: i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.waitHelp', {
        defaultMessage:
          'Waiting for late data. Each rule counts a minute only after giving slow log shippers a couple of minutes, then the engine reads the result on its next one-minute run. This wait is by design.',
      }),
    });
  }
  milestones.push(
    {
      id: 'raised',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.raised', {
        defaultMessage: 'Event raised',
      }),
      at: reaction.raisedAt,
      gapHelp:
        reaction.runStartedAt !== undefined
          ? i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.engineHelp', {
              defaultMessage:
                'The engine run: comparing with normal, deciding whether it is a known problem, and the AI step checking the evidence.',
            })
          : i18n.translate(
              'xpack.significantEventsApp.detectionEngine.reaction.waitAndEngineHelp',
              {
                defaultMessage:
                  'Waiting for late data, then the engine run: comparing with normal, joining, and the AI step checking the evidence.',
              }
            ),
    },
    {
      id: 'published',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.published', {
        defaultMessage: 'Alert published',
      }),
      at: reaction.publishedAt,
      gapHelp: i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.publishHelp', {
        defaultMessage:
          'Written as an Alerting v2 alert, where the Significant events tab, workflows and notifications pick it up.',
      }),
    }
  );
  return milestones;
}

const MINUTE_MS = 60_000;

interface IReactionStripProps {
  reaction: IEventReaction;
  /** How long the strategy that raised it waits for late data after a minute ends. */
  settleMs?: number;
  originLabel: string;
}

/** How fast the engine raised the event, from the first bad minute to the published alert. */
export function ReactionStrip({ reaction, settleMs, originLabel }: IReactionStripProps) {
  const milestones = buildMilestones(reaction);
  const headline =
    reaction.raisedAt === undefined
      ? i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.unknown', {
          defaultMessage: 'Not raised yet',
        })
      : i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.headline', {
          defaultMessage: 'Raised {duration} after the problem started',
          values: { duration: formatDuration(reaction.raisedAt - reaction.startedAt) },
        });

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="detectionEngineReactionStrip">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{headline}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {settleMs !== undefined && settleMs > 0 && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.designMinimum', {
                defaultMessage:
                  'By design at least {minimum}: {strategy} waits {settle} after each minute for late data, then the engine runs within a minute.',
                values: {
                  minimum: formatDuration(MINUTE_MS + settleMs),
                  strategy: originLabel,
                  settle: formatDuration(settleMs),
                },
              })}
            </EuiText>
          </EuiFlexItem>
        )}
        {reaction.isCatchUp && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">
              {i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.catchUp', {
                defaultMessage: 'Raised while catching up on past minutes, not live',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFlexGroup
        gutterSize="none"
        alignItems="flexStart"
        responsive={false}
        style={{ marginTop: 6 }}
      >
        {milestones.map((milestone, index) => {
          const previous = milestones[index - 1];
          const gap =
            previous?.at !== undefined && milestone.at !== undefined
              ? milestone.at - previous.at
              : undefined;
          return (
            <React.Fragment key={milestone.id}>
              {index > 0 && (
                <EuiFlexItem grow={false} style={{ minWidth: 70, alignItems: 'center' }}>
                  <EuiToolTip content={milestone.gapHelp}>
                    <EuiBadge color="hollow" tabIndex={0}>
                      {gap === undefined ? '…' : `+${formatDuration(gap)}`}
                    </EuiBadge>
                  </EuiToolTip>
                  <div
                    aria-hidden={true}
                    style={{ borderTop: '1px dashed currentColor', width: '100%', opacity: 0.3 }}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem data-test-subj={`detectionEngineReaction-${milestone.id}`}>
                <EuiText size="xs" color={milestone.at === undefined ? 'subdued' : undefined}>
                  <strong>{milestone.label}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {milestone.at === undefined
                    ? i18n.translate(
                        'xpack.significantEventsApp.detectionEngine.reaction.pending',
                        {
                          defaultMessage: 'not yet',
                        }
                      )
                    : formatTime(new Date(milestone.at).toISOString())}
                </EuiText>
              </EuiFlexItem>
            </React.Fragment>
          );
        })}
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="questionInCircle"
            color="subdued"
            content={i18n.translate('xpack.significantEventsApp.detectionEngine.reaction.help', {
              defaultMessage:
                'Times are wall-clock, except "Problem started", which is the start of the first minute of data that was above normal. Hover a gap to see what the engine does in it.',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

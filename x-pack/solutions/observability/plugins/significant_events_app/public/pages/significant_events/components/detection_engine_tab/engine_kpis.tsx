/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiPanel, EuiStat, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  EngineEvent,
  EngineOverviewResponse,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React from 'react';
import { medianTimeToRaise } from './event_reaction';
import { formatDuration, formatTokens, formatUsd } from './format';

const DAY_MS = 24 * 60 * 60_000;

interface IEngineKpisProps {
  overview: EngineOverviewResponse;
  events: EngineEvent[];
}

/** The handful of numbers worth keeping an eye on, in one compact row. */
export function EngineKpis({ overview, events }: IEngineKpisProps) {
  const { counts, cost } = overview;
  const { ledger } = cost;
  const eventsToday = overview.strategies.reduce((sum, strategy) => sum + strategy.opened_today, 0);
  const tokens = ledger.prompt_tokens + ledger.completion_tokens;
  // Recomputed every poll from the events already on the page; at most a few hundred windows.
  const reaction = medianTimeToRaise({ events, since: Date.now() - DAY_MS });

  const costBreakdown = i18n.translate(
    'xpack.significantEventsApp.detectionEngine.kpi.costBreakdown',
    {
      defaultMessage:
        'Model calls only, at Elastic Inference Service list price, per UTC day. Today: {todayCalls} calls. Since {since}: {total}, {calls} calls, {tokens} tokens ({prompt} in, {completion} out){unpriced}.',
      values: {
        todayCalls: cost.today_calls,
        total: formatUsd(ledger.total_usd),
        since: new Date(ledger.since).toLocaleString(),
        calls: ledger.calls,
        tokens: formatTokens(tokens),
        prompt: formatTokens(ledger.prompt_tokens),
        completion: formatTokens(ledger.completion_tokens),
        unpriced:
          ledger.unpriced_tokens > 0
            ? i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.unpriced', {
                defaultMessage: '; {tokens} tokens on models without a list price are not included',
                values: { tokens: formatTokens(ledger.unpriced_tokens) },
              })
            : '',
      },
    }
  );

  const tiles = [
    {
      id: 'open',
      title: String(counts.open_events),
      description: i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.open', {
        defaultMessage: 'Open significant events',
      }),
      color: counts.open_events > 0 ? 'danger' : 'default',
    },
    {
      id: 'today',
      title: String(eventsToday),
      description: i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.today', {
        defaultMessage: 'Events raised today',
      }),
      color: 'default',
    },
    {
      id: 'detections',
      title: String(counts.detections_last_hour),
      description: i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.detections', {
        defaultMessage: 'Detections in the last hour',
      }),
      color: 'default',
    },
  ];

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} wrap data-test-subj="detectionEngineKpis">
      {tiles.map((tile) => (
        <EuiFlexItem key={tile.id} style={{ minWidth: 140 }}>
          <EuiPanel hasBorder paddingSize="s">
            <EuiStat
              title={tile.title}
              description={tile.description}
              titleColor={tile.color}
              titleSize="s"
              reverse
              descriptionElement="div"
              data-test-subj={`detectionEngineKpi-${tile.id}`}
            />
          </EuiPanel>
        </EuiFlexItem>
      ))}
      <EuiFlexItem style={{ minWidth: 200 }}>
        <EuiPanel hasBorder paddingSize="s">
          <EuiStat
            title={reaction ? formatDuration(reaction.medianMs) : '-'}
            titleSize="s"
            reverse
            descriptionElement="div"
            data-test-subj="detectionEngineKpi-reaction"
            description={
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.reaction', {
                    defaultMessage: 'Typical time to raise',
                  })}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    type="info"
                    content={i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.kpi.reactionHelp',
                      {
                        defaultMessage:
                          'Median over the last 24 hours, from the start of the first minute that was above normal to the engine raising the event. Most of it is the wait for late data that each rule builds in. Events raised while catching up on past minutes are left out.',
                      }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiText size="xs" color="subdued">
              {reaction
                ? i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.reactionRange', {
                    defaultMessage:
                      '{count, plural, one {# event} other {# events}} · fastest {fastest}, slowest {slowest}',
                    values: {
                      count: reaction.count,
                      fastest: formatDuration(reaction.fastestMs),
                      slowest: formatDuration(reaction.slowestMs),
                    },
                  })
                : i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.reactionNone', {
                    defaultMessage: 'No event raised live in the last 24 hours',
                  })}
            </EuiText>
          </EuiStat>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 220 }}>
        <EuiPanel hasBorder paddingSize="s">
          <EuiStat
            // Today, not the running total: a cheap model's calls barely move a total that
            // includes past runs on a pricier one, and the cost looked frozen.
            title={formatUsd(cost.today_usd)}
            titleSize="s"
            reverse
            descriptionElement="div"
            data-test-subj="detectionEngineKpi-cost"
            description={
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.cost', {
                    defaultMessage: 'Model cost today',
                  })}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip type="info" content={costBreakdown} />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiText size="xs" color="subdued">
              {cost.current_price
                ? i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.costModel', {
                    defaultMessage: '{tokens} tokens today · {model}',
                    values: {
                      tokens: formatTokens(cost.today_tokens),
                      model: cost.current_price.model,
                    },
                  })
                : i18n.translate('xpack.significantEventsApp.detectionEngine.kpi.costHeuristic', {
                    defaultMessage: '{tokens} tokens today · heuristic agent is free',
                    values: { tokens: formatTokens(cost.today_tokens) },
                  })}
            </EuiText>
          </EuiStat>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

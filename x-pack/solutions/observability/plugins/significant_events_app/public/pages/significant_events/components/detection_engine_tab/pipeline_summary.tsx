/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DetectionOutcome, EngineRunSummary } from '@kbn/significant-events-plugin/common';
import React from 'react';
import { formatTokens, formatUsd } from './format';
import { OUTCOME_LABELS, STATUS_LABELS, STRATEGY_LABELS, type StepTone } from './labels';
import { useToneColors } from './use_tone_colors';

interface IStageProps {
  testId: string;
  icon: string;
  title: string;
  owner: string;
  tone: StepTone;
  value: number | string;
  children: React.ReactNode;
}

function Stage({ testId, icon, title, owner, tone, value, children }: IStageProps) {
  const colors = useToneColors()[tone];
  return (
    <EuiFlexItem>
      <EuiPanel
        paddingSize="s"
        hasBorder
        style={{
          backgroundColor: colors.background,
          borderTop: `3px solid ${colors.border}`,
          height: '100%',
        }}
        data-test-subj={testId}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={icon} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="xs" color="subdued">
          {owner}
        </EuiText>
        <EuiTitle size="m">
          <p>{value}</p>
        </EuiTitle>
        <EuiText size="xs">{children}</EuiText>
      </EuiPanel>
    </EuiFlexItem>
  );
}

function Arrow() {
  return (
    <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
      <EuiIcon type="sortRight" color="subdued" aria-hidden={true} />
    </EuiFlexItem>
  );
}

function Legend() {
  const colors = useToneColors();
  const items: Array<{ tone: StepTone; label: string }> = [
    {
      tone: 'customer',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.legend.customer', {
        defaultMessage: 'What the customer chose',
      }),
    },
    {
      tone: 'code',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.legend.code', {
        defaultMessage: 'Decided by code, the same every time',
      }),
    },
    {
      tone: 'ai',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.legend.ai', {
        defaultMessage: 'The one AI step',
      }),
    },
  ];
  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      {items.map((item) => (
        <EuiFlexItem grow={false} key={item.tone}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: colors[item.tone].background,
                  border: `1px solid ${colors[item.tone].border}`,
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{item.label}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

const IDENTITY_OUTCOMES: DetectionOutcome[] = [
  'new_event',
  'joined',
  'continued',
  'reopened',
  'held_by_dismissal',
  'trial_would_raise',
  'refuted',
  'capped',
  'deferred',
];

interface IPipelineSummaryProps {
  run: EngineRunSummary | undefined;
}

/** The last evaluated minute, step by step, from what was watched to the events it changed. */
export function PipelineSummary({ run }: IPipelineSummaryProps) {
  if (!run) {
    return (
      <EuiPanel hasBorder data-test-subj="detectionEnginePipelineEmpty">
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.empty', {
            defaultMessage:
              'Nothing evaluated yet. Set up the demo system, then press Run now or turn on Auto-run.',
          })}
        </EuiText>
      </EuiPanel>
    );
  }

  const observations = run.strategies.reduce((sum, strategy) => sum + strategy.observations, 0);
  const lookedOff = run.strategies.reduce((sum, strategy) => sum + strategy.looked_off, 0);
  const failed = run.strategies.filter((strategy) => strategy.error);
  const identityCount = IDENTITY_OUTCOMES.reduce(
    (sum, outcome) => sum + (run.outcomes[outcome] ?? 0),
    0
  );
  const opened = run.transitions.filter((transition) => transition.from === 'none').length;
  const changed = run.transitions.filter((transition) => transition.from !== 'none');

  return (
    <EuiPanel hasBorder data-test-subj="detectionEnginePipeline">
      <EuiFlexGroup alignItems="center" responsive={false} wrap>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.title', {
                defaultMessage: 'How the last minute was handled ({from} - {to})',
                values: {
                  from: new Date(run.bucket_start).toLocaleTimeString(),
                  to: new Date(run.bucket_end).toLocaleTimeString(),
                },
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Legend />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs" responsive={false} style={{ marginTop: 8 }}>
        <Stage
          testId="detectionEngineStageStrategies"
          icon="eye"
          tone="customer"
          title={i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.strategies', {
            defaultMessage: '1. Watch',
          })}
          owner={i18n.translate(
            'xpack.significantEventsApp.detectionEngine.pipeline.strategiesOwner',
            {
              defaultMessage: 'Detection strategies check each series',
            }
          )}
          value={observations}
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.lookedOff', {
            defaultMessage: '{count} looked off',
            values: { count: lookedOff },
          })}
          {failed.length > 0 && (
            <>
              {' · '}
              {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.failedCount', {
                defaultMessage: '{count} failed',
                values: { count: failed.length },
              })}{' '}
              <EuiIconTip
                type="warning"
                color="danger"
                content={failed
                  .map((strategy) => `${STRATEGY_LABELS[strategy.strategy]}: ${strategy.error}`)
                  .join('\n')}
              />
            </>
          )}
        </Stage>
        <Arrow />
        <Stage
          testId="detectionEngineStageBaseline"
          icon="visLine"
          tone="code"
          title={i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.baseline', {
            defaultMessage: '2. Compare with normal',
          })}
          owner={i18n.translate(
            'xpack.significantEventsApp.detectionEngine.pipeline.baselineOwner',
            {
              defaultMessage: 'Each series against its own history',
            }
          )}
          value={run.baseline.above_normal + run.baseline.skipped}
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.baselineDetail', {
            defaultMessage:
              'Above normal: {above}{skipped}. Within normal: {background}. Warming up: {warming}.',
            values: {
              above: run.baseline.above_normal,
              skipped:
                run.baseline.skipped > 0
                  ? i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.pipeline.skippedPart',
                      {
                        defaultMessage: ', plus {count} customer alerts',
                        values: { count: run.baseline.skipped },
                      }
                    )
                  : '',
              background: run.baseline.background,
              warming: run.baseline.warming_up,
            },
          })}
        </Stage>
        <Arrow />
        <Stage
          testId="detectionEngineStageDiscovery"
          icon="link"
          tone="code"
          title={i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.discovery', {
            defaultMessage: '3. Same problem?',
          })}
          owner={i18n.translate(
            'xpack.significantEventsApp.detectionEngine.pipeline.discoveryOwner',
            {
              defaultMessage: 'Identity and join proposals',
            }
          )}
          value={identityCount}
        >
          {IDENTITY_OUTCOMES.filter((outcome) => run.outcomes[outcome]).map((outcome) => (
            <div key={outcome}>
              {OUTCOME_LABELS[outcome]}: <strong>{run.outcomes[outcome]}</strong>
            </div>
          ))}
          {identityCount === 0 &&
            i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.nothing', {
              defaultMessage: 'Nothing above normal',
            })}
        </Stage>
        <Arrow />
        <Stage
          testId="detectionEngineStageAgent"
          icon="sparkles"
          tone="ai"
          title={i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.agent', {
            defaultMessage: '4. AI checks evidence',
          })}
          owner={i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.agentOwner', {
            defaultMessage: 'Verdicts, severity, explanation',
          })}
          value={run.agent.calls}
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.agentDetail', {
            defaultMessage: 'Skipped by cooldown: {cooldown}. Rejected by code: {rejected}.',
            values: { cooldown: run.agent.cooldown_skips, rejected: run.agent.rejected_answers },
          })}
          {run.agent.tokens > 0 && (
            <div>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.agentCost', {
                defaultMessage: '{tokens} tokens{cost}',
                values: {
                  tokens: formatTokens(run.agent.tokens),
                  cost:
                    typeof run.agent.cost_usd === 'number'
                      ? `, ${formatUsd(run.agent.cost_usd)}`
                      : '',
                },
              })}
            </div>
          )}
        </Stage>
        <Arrow />
        <Stage
          testId="detectionEngineStageEvents"
          icon="bell"
          tone="event"
          title={i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.events', {
            defaultMessage: '5. Event status',
          })}
          owner={i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.eventsOwner', {
            defaultMessage: 'One state machine, in code',
          })}
          value={run.open_events}
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.open', {
            defaultMessage: 'Open events',
          })}
          {opened > 0 && (
            <div>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.pipeline.opened', {
                defaultMessage: 'Opened: {count}',
                values: { count: opened },
              })}
            </div>
          )}
          {changed.map((transition) => (
            <div key={`${transition.event_id}-${transition.to}`}>
              {STATUS_LABELS[transition.from as keyof typeof STATUS_LABELS]} →{' '}
              {STATUS_LABELS[transition.to]}
            </div>
          ))}
        </Stage>
      </EuiFlexGroup>
      {run.skipped && (
        <EuiText size="xs" color="subdued">
          {run.skipped}
        </EuiText>
      )}
    </EuiPanel>
  );
}

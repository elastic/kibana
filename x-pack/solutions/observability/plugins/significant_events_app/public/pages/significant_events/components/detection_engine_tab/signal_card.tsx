/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AssessmentVerdict,
  EngineDetection,
  EventMember,
  EventOpenWindow,
  SeriesSample,
  StrategyOverview,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React from 'react';
import { EvidencePanel } from './evidence_panel';
import { formatTime, formatValue } from './format';
import {
  STRATEGY_ICONS,
  STRATEGY_LABELS,
  VERDICT_COLORS,
  VERDICT_LABELS,
  signalRuleText,
} from './labels';
import { SignalChart } from './signal_chart';

/** The detection that first put this signal above normal in the latest open window. */
function firstDetectionOf({
  detections,
  fingerprint,
  window,
}: {
  detections: EngineDetection[];
  fingerprint: string;
  window: EventOpenWindow;
}): EngineDetection | undefined {
  return detections
    .filter(
      (detection) =>
        detection.fingerprint === fingerprint &&
        detection.bucket_start >= window.from &&
        detection.baseline.decision !== 'background' &&
        detection.baseline.decision !== 'warming_up'
    )
    .sort((a, b) => a.bucket_start.localeCompare(b.bucket_start))[0];
}

/** How the figures compared with normal, in one sentence. */
function describeDetection({
  detection,
  member,
}: {
  detection: EngineDetection | undefined;
  member: EventMember;
}): string {
  if (!detection) {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.signal.noDetection', {
      defaultMessage: 'First seen at {time}.',
      values: { time: formatTime(member.first_seen) },
    });
  }
  const { baseline } = detection;
  const value = formatValue(detection.value, detection.unit);
  const time = formatTime(detection.bucket_start);
  if (baseline.decision === 'skipped') {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.signal.skipped', {
      defaultMessage:
        "At {time} the customer's own alert was active. The engine trusts that rule and does not compare it with history.",
      values: { time },
    });
  }
  if (baseline.threshold === undefined) {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.signal.newByDefinition', {
      defaultMessage:
        'At {time}: {value}. Anything above zero counts, since it was not there before.',
      values: { time, value },
    });
  }
  return i18n.translate('xpack.significantEventsApp.detectionEngine.signal.aboveNormal', {
    defaultMessage:
      'At {time}: {value}, above its normal of up to {threshold}. Normal comes from its own last {samples} minutes (median {median}){excluded}.',
    values: {
      time,
      value,
      threshold: formatValue(baseline.threshold, detection.unit),
      samples: baseline.samples,
      median: baseline.median === undefined ? '-' : formatValue(baseline.median, detection.unit),
      excluded:
        baseline.excludedSamples > 0
          ? i18n.translate('xpack.significantEventsApp.detectionEngine.signal.excluded', {
              defaultMessage: ', leaving out {count} minutes when an event was open',
              values: { count: baseline.excludedSamples },
            })
          : '',
    },
  });
}

interface ISignalCardProps {
  eventId: string;
  member: EventMember;
  strategy?: StrategyOverview;
  verdict?: AssessmentVerdict;
  detections: EngineDetection[];
  window: EventOpenWindow;
  series?: { from: string; to: string; samples: SeriesSample[] };
  discoverHref?: string;
}

/** One signal of an event: how it was detected, its minutes against normal, and its evidence. */
export function SignalCard({
  eventId,
  member,
  strategy,
  verdict,
  detections,
  window,
  series,
  discoverHref,
}: ISignalCardProps) {
  const detection = firstDetectionOf({ detections, fingerprint: member.fingerprint, window });
  const ruleText = signalRuleText({
    fingerprint: member.fingerprint,
    reportsWhen: strategy?.reportsWhen,
  });
  // A signal that fired only in an earlier occurrence is quiet in the window the chart shows.
  const isFromEarlierOccurrence = member.last_seen < window.from;

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      data-test-subj={`detectionEngineSignal-${member.fingerprint}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={strategy?.watches}>
            <EuiBadge color="hollow" iconType={STRATEGY_ICONS[member.strategy]} tabIndex={0}>
              {STRATEGY_LABELS[member.strategy]}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{member.title}</strong>
          </EuiText>
        </EuiFlexItem>
        {isFromEarlierOccurrence && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.significantEventsApp.detectionEngine.signal.earlierBadge', {
                defaultMessage: 'Earlier occurrence',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">{member.service}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color={member.healthy ? 'success' : 'danger'}>
            {member.healthy
              ? i18n.translate('xpack.significantEventsApp.detectionEngine.signal.healthy', {
                  defaultMessage: 'Normal for {streak} min',
                  values: { streak: member.healthy_streak },
                })
              : i18n.translate('xpack.significantEventsApp.detectionEngine.signal.firing', {
                  defaultMessage: 'Above normal',
                })}
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <p style={{ marginBottom: 2 }}>
          <strong>
            {i18n.translate('xpack.significantEventsApp.detectionEngine.signal.howDetected', {
              defaultMessage: 'How it was detected:',
            })}
          </strong>{' '}
          {ruleText ? `${ruleText}. ` : ''}
          {isFromEarlierOccurrence && !detection
            ? i18n.translate('xpack.significantEventsApp.detectionEngine.signal.earlier', {
                defaultMessage:
                  'Last above normal at {time}, in an earlier occurrence of this event; it stayed quiet in this one.',
                values: { time: formatTime(member.last_seen) },
              })
            : describeDetection({ detection, member })}
        </p>
      </EuiText>
      <EuiText size="xs" color="subdued">
        <p style={{ marginBottom: 2 }}>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.signal.figures', {
            defaultMessage: 'Peak {peak}, latest {latest}. In this event since {joined}: {reason}.',
            values: {
              peak: formatValue(member.peak_value, member.unit),
              latest: formatValue(member.value, member.unit),
              joined: formatTime(member.joined_at),
              reason: member.join_reason,
            },
          })}
        </p>
      </EuiText>
      {series && (
        <SignalChart
          id={member.fingerprint}
          strategy={member.strategy}
          samples={series.samples}
          unit={member.unit}
          threshold={detection?.baseline.threshold ?? member.threshold}
          from={series.from}
          to={series.to}
          openFrom={window.from}
          openTo={window.to}
        />
      )}
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sparkles" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            {verdict ? (
              <>
                <EuiBadge color={VERDICT_COLORS[verdict.verdict]}>
                  {VERDICT_LABELS[verdict.verdict]}
                </EuiBadge>{' '}
                {verdict.note}
              </>
            ) : (
              <span>
                {i18n.translate('xpack.significantEventsApp.detectionEngine.signal.notJudged', {
                  defaultMessage:
                    'The AI step has not judged this signal yet; it joined after the last assessment.',
                })}
              </span>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiAccordion
        id={`detectionEngineEvidence-${member.fingerprint}`}
        buttonContent={
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.signal.evidence', {
                defaultMessage: 'Evidence',
              })}
            </strong>{' '}
            {member.evidence_result === 'found'
              ? i18n.translate('xpack.significantEventsApp.detectionEngine.signal.evidenceFound', {
                  defaultMessage: '· the agent saw matching rows',
                })
              : member.evidence_result === 'empty'
              ? i18n.translate('xpack.significantEventsApp.detectionEngine.signal.evidenceEmpty', {
                  defaultMessage: '· the agent saw no rows',
                })
              : member.evidence_result === 'error'
              ? i18n.translate('xpack.significantEventsApp.detectionEngine.signal.evidenceError', {
                  defaultMessage: '· the query failed for the agent',
                })
              : ''}
          </EuiText>
        }
        paddingSize="xs"
      >
        <EvidencePanel
          eventId={eventId}
          fingerprint={member.fingerprint}
          query={member.evidence_esql}
          discoverHref={discoverHref}
        />
      </EuiAccordion>
    </EuiPanel>
  );
}

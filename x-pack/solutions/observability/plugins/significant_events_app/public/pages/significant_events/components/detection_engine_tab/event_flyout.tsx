/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHealth,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  DISMISSAL_REASONS,
  type DismissalReason,
  type EngineEvent,
  type StrategyOverview,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React, { useState } from 'react';
import { useDetectionEngineEvent } from '../../../../hooks/use_detection_engine_event';
import { useDetectionEngineEventSeries } from '../../../../hooks/use_detection_engine_event_series';
import { useGenAIConnectors } from '../../../../hooks/use_genai_connectors';
import type { IDetectionEngineActions } from '../../../../hooks/use_detection_engine_actions';
import { useKibana } from '../../../../hooks/use_kibana';
import { buildDiscoverParams } from '../../../../util/discover_helpers';
import { SIGNIFICANT_EVENT_SEVERITY } from '../severity_badge/severity_badge';
import { DetectionsList } from './detections_list';
import { describeStatus, latestWindow, reactionOf } from './event_reaction';
import { EventTimeline } from './event_timeline';
import { formatDuration, formatTime } from './format';
import {
  DISMISSAL_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STRATEGY_ICONS,
  STRATEGY_LABELS,
} from './labels';
import { ReactionStrip } from './reaction_strip';
import { SignalCard } from './signal_card';

/** Discover opens on some time before the signal, so the evidence has context around it. */
const DISCOVER_LEAD_MS = 30 * 60_000;

interface IDismissPopoverProps {
  onDismiss: (reason: DismissalReason, note?: string) => void;
  isLoading: boolean;
}

function DismissPopover({ onDismiss, isLoading }: IDismissPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<DismissalReason>('false_positive');
  const [note, setNote] = useState('');

  return (
    <EuiPopover
      aria-label={i18n.translate(
        'xpack.significantEventsApp.detectionEngine.flyout.dismissPopover',
        {
          defaultMessage: 'Dismiss this event',
        }
      )}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiButton
          color="warning"
          size="s"
          isLoading={isLoading}
          data-test-subj="detectionEngineDismissButton"
          onClick={() => setIsOpen(!isOpen)}
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.dismiss', {
            defaultMessage: 'Dismiss with a reason',
          })}
        </EuiButton>
      }
    >
      <div style={{ width: 300 }}>
        <EuiFormRow
          label={i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.reason', {
            defaultMessage: 'Reason',
          })}
        >
          <EuiSelect
            data-test-subj="detectionEngineDismissReason"
            value={reason}
            options={DISMISSAL_REASONS.map((value) => ({ value, text: DISMISSAL_LABELS[value] }))}
            onChange={(event) => setReason(event.target.value as DismissalReason)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.note', {
            defaultMessage: 'Note for the engine (optional)',
          })}
        >
          <EuiFieldText
            data-test-subj="significantEventsAppDismissPopoverFieldText"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiButton
          fill
          size="s"
          color="warning"
          data-test-subj="detectionEngineDismissConfirm"
          onClick={() => {
            setIsOpen(false);
            onDismiss(reason, note.trim() || undefined);
          }}
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.confirmDismiss', {
            defaultMessage: 'Dismiss',
          })}
        </EuiButton>
      </div>
    </EuiPopover>
  );
}

interface IEventFlyoutProps {
  eventId: string;
  actions: IDetectionEngineActions;
  strategies: StrategyOverview[];
  quietPeriodBuckets: number;
  onClose: () => void;
}

/**
 * One event: its status and what that means, how fast it was raised, each signal with how it
 * was detected and its evidence, and what the engine did along the way.
 */
export function EventFlyout({
  eventId,
  actions,
  strategies,
  quietPeriodBuckets,
  onClose,
}: IEventFlyoutProps) {
  const { data, isLoading } = useDetectionEngineEvent(eventId);
  const { data: seriesData } = useDetectionEngineEventSeries(eventId);
  const { share } = useKibana().dependencies.start;
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const titleId = useGeneratedHtmlId();
  const { connectors } = useGenAIConnectors();

  const discoverHref = (query: string, from: string) =>
    discoverLocator?.getRedirectUrl(
      buildDiscoverParams(query, {
        from: new Date(Date.parse(from) - DISCOVER_LEAD_MS).toISOString(),
        to: 'now',
      })
    );

  const event: EngineEvent | undefined = data?.event;
  const window = event ? latestWindow(event) : undefined;
  const reaction = window ? reactionOf({ window, activity: data?.activity }) : undefined;
  const earlierWindows = event ? event.open_windows.slice(0, -1) : [];
  // Each episode is its own case; only the current one's confirmation shows here.
  const currentConfirmation = event?.confirmations?.find(
    (item) => item.episode === event.open_windows.length
  );
  // Firing signals first, since they keep the event open; then this occurrence's, then older.
  const members = event
    ? [...event.members].sort(
        (a, b) =>
          Number(a.healthy) - Number(b.healthy) ||
          Number(a.last_seen < (window?.from ?? '')) - Number(b.last_seen < (window?.from ?? '')) ||
          a.joined_at.localeCompare(b.joined_at)
      )
    : [];
  const firing = members.filter((member) => !member.healthy).length;
  const strategyIds = event ? [...new Set(event.members.map((member) => member.strategy))] : [];

  return (
    <EuiFlyout
      onClose={onClose}
      size="l"
      aria-labelledby={titleId}
      data-test-subj="detectionEngineEventFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        {event ? (
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiBadge color={SIGNIFICANT_EVENT_SEVERITY[event.severity].color}>
                  {SIGNIFICANT_EVENT_SEVERITY[event.severity].label}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHealth
                  color={STATUS_COLORS[event.status]}
                  data-test-subj="detectionEngineEventStatus"
                >
                  <strong>{STATUS_LABELS[event.status]}</strong>
                </EuiHealth>
              </EuiFlexItem>
              {event.services.map((service) => (
                <EuiFlexItem grow={false} key={service}>
                  <EuiBadge color="hollow">{service}</EuiBadge>
                </EuiFlexItem>
              ))}
              {strategyIds.map((strategy) => (
                <EuiFlexItem grow={false} key={strategy}>
                  <EuiBadge color="hollow" iconType={STRATEGY_ICONS[strategy]}>
                    {STRATEGY_LABELS[strategy]}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
              {event.episode > 1 && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.episode', {
                      defaultMessage: 'Occurrence {episode}',
                      values: { episode: event.episode },
                    })}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiTitle size="m">
              <h2 id={titleId}>{event.title}</h2>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued" data-test-subj="detectionEngineEventStatusDetail">
              {describeStatus({ event, quietPeriodBuckets })}
            </EuiText>
          </>
        ) : (
          <EuiLoadingSpinner />
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading || !event || !data || !window || !reaction ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <>
            <ReactionStrip
              reaction={reaction}
              settleMs={strategies.find((item) => item.id === event.origin_strategy)?.settleMs}
              originLabel={STRATEGY_LABELS[event.origin_strategy]}
            />
            {earlierWindows.length > 0 && (
              <EuiText size="xs" color="subdued" style={{ marginTop: 4 }}>
                {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.earlier', {
                  defaultMessage: 'Earlier occurrences: {list}',
                  values: {
                    list: earlierWindows
                      .map((item) => {
                        const earlier = reactionOf({ window: item, activity: data.activity });
                        const raised =
                          earlier.raisedAt === undefined
                            ? ''
                            : i18n.translate(
                                'xpack.significantEventsApp.detectionEngine.flyout.earlierRaised',
                                {
                                  defaultMessage: ', raised after {duration}',
                                  values: {
                                    duration: formatDuration(earlier.raisedAt - earlier.startedAt),
                                  },
                                }
                              );
                        const open = item.to
                          ? i18n.translate(
                              'xpack.significantEventsApp.detectionEngine.flyout.earlierOpen',
                              {
                                defaultMessage: ', open {duration}',
                                values: {
                                  duration: formatDuration(
                                    Date.parse(item.to) - Date.parse(item.from)
                                  ),
                                },
                              }
                            )
                          : '';
                        return `${formatTime(item.from)}${raised}${open}`;
                      })
                      .join(' · '),
                  },
                })}
              </EuiText>
            )}
            <EuiSpacer size="m" />
            <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="sparkles" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <h3>
                      {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.why', {
                        defaultMessage: 'Why this is significant',
                      })}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                {event.assessment && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate(
                        'xpack.significantEventsApp.detectionEngine.flyout.assessedBy',
                        {
                          defaultMessage: 'Judged by {agent} at {time}',
                          values: {
                            agent:
                              event.assessment.agent === 'agent_builder'
                                ? connectors?.find(
                                    (connector) =>
                                      connector.connectorId === event.assessment?.connector_id
                                  )?.name ??
                                  event.assessment.connector_id ??
                                  'a model'
                                : i18n.translate(
                                    'xpack.significantEventsApp.detectionEngine.flyout.heuristic',
                                    { defaultMessage: 'the heuristic agent (no model)' }
                                  ),
                            time: formatTime(event.assessment.at),
                          },
                        }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                <p data-test-subj="detectionEngineEventSummary">{event.summary}</p>
              </EuiText>
              {event.assessment?.severity_guard && (
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.severityGuarded',
                    {
                      defaultMessage: 'Severity: the agent proposed {proposed}. {guard}',
                      values: {
                        proposed: event.assessment.proposed_severity,
                        guard: event.assessment.severity_guard,
                      },
                    }
                  )}
                </EuiText>
              )}
              {event.assessment?.explanation && (
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.agentNotes', {
                    defaultMessage: 'Agent and validation notes: {notes}',
                    values: { notes: event.assessment.explanation },
                  })}
                </EuiText>
              )}
            </EuiPanel>
            {event.verification && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color={event.verification.holds ? 'success' : 'warning'}
                  iconType={event.verification.holds ? 'check' : 'warning'}
                  title={i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.verification',
                    {
                      defaultMessage: 'Re-checked at {time} ({trigger}): {details}',
                      values: {
                        time: formatTime(event.verification.at),
                        trigger: event.verification.trigger,
                        details: event.verification.details,
                      },
                    }
                  )}
                />
              </>
            )}
            {event.dismissal && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color="warning"
                  iconType="eyeClosed"
                  title={i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.dismissalHold',
                    {
                      defaultMessage:
                        'Dismissed as {reason}{note}. It stays quiet until the problem gets worse than when it was dismissed.',
                      values: {
                        reason: DISMISSAL_LABELS[event.dismissal.reason],
                        note: event.dismissal.note ? ` ("${event.dismissal.note}")` : '',
                      },
                    }
                  )}
                />
              </>
            )}
            {currentConfirmation && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color="success"
                  iconType="checkCircle"
                  title={i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.confirmed',
                    {
                      defaultMessage:
                        'Confirmed as a real problem{note}. Every future change to the engine must keep catching it.',
                      values: {
                        note: currentConfirmation.note ? ` ("${currentConfirmation.note}")` : '',
                      },
                    }
                  )}
                />
              </>
            )}
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.signals', {
                  defaultMessage:
                    '{total} {total, plural, one {signal} other {signals}}, {firing} above normal',
                  values: { total: members.length, firing },
                })}
              </h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.signalsHelp', {
                defaultMessage:
                  'Each signal is one measured series a strategy watches. The chart shows its minutes against normal (dashed line), with the open period shaded.',
              })}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              direction="column"
              gutterSize="s"
              data-test-subj="detectionEngineEventSignals"
            >
              {members.map((member) => {
                const samples = seriesData?.series.find(
                  (item) => item.fingerprint === member.fingerprint
                )?.samples;
                return (
                  <EuiFlexItem key={member.fingerprint}>
                    <SignalCard
                      eventId={event.event_id}
                      member={member}
                      strategy={strategies.find((item) => item.id === member.strategy)}
                      verdict={event.assessment?.verdicts.find(
                        (item) => item.fingerprint === member.fingerprint
                      )}
                      detections={data.detections}
                      window={window}
                      series={
                        seriesData && samples
                          ? { from: seriesData.from, to: seriesData.to, samples }
                          : undefined
                      }
                      discoverHref={discoverHref(member.evidence_esql, member.first_seen)}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EventTimeline activity={data.activity} episode={event.episode} />
            <EuiSpacer size="m" />
            <EuiAccordion
              id="detectionEngineEventDetections"
              buttonContent={
                <EuiText size="s">
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.detections', {
                    defaultMessage: 'Every detection behind it ({count})',
                    values: { count: data.detections.length },
                  })}
                </EuiText>
              }
              paddingSize="s"
            >
              <DetectionsList detections={data.detections} />
            </EuiAccordion>
          </>
        )}
      </EuiFlyoutBody>
      {event && (
        <EuiFlyoutFooter>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {event.status !== 'inactive' && (
              <EuiFlexItem grow={false}>
                <DismissPopover
                  isLoading={actions.pendingAction === 'dismiss'}
                  onDismiss={(reason, note) =>
                    actions.dismissEvent({ eventId: event.event_id, reason, note })
                  }
                />
              </EuiFlexItem>
            )}
            {event.status !== 'inactive' && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  data-test-subj="detectionEngineCloseEventButton"
                  isLoading={actions.pendingAction === 'close'}
                  onClick={() => actions.closeEvent(event.event_id)}
                >
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.close', {
                    defaultMessage: 'Close as operator',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
            {!currentConfirmation && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="success"
                  iconType="checkCircle"
                  data-test-subj="detectionEngineConfirmButton"
                  isLoading={actions.pendingAction === 'confirm'}
                  onClick={() => actions.confirmEvent({ eventId: event.event_id })}
                >
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.confirm', {
                    defaultMessage: 'Confirm real problem',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="check"
                data-test-subj="detectionEngineVerifyButton"
                isLoading={actions.pendingAction === 'verify'}
                onClick={() => actions.verifyEvent(event.event_id)}
              >
                {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.verify', {
                  defaultMessage: 'Re-check evidence',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="significantEventsAppEventFlyoutDoneButton"
                size="s"
                onClick={onClose}
              >
                {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.done', {
                  defaultMessage: 'Done',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescriptionList,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  DISMISSAL_REASONS,
  type DismissalReason,
  type EngineEvent,
  type EventMember,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React, { useState } from 'react';
import { useDetectionEngineEvent } from '../../../../hooks/use_detection_engine_event';
import type { IDetectionEngineActions } from '../../../../hooks/use_detection_engine_actions';
import { useKibana } from '../../../../hooks/use_kibana';
import { buildDiscoverParams } from '../../../../util/discover_helpers';
import { SIGNIFICANT_EVENT_SEVERITY } from '../severity_badge/severity_badge';
import { formatValue } from './format';
import { useToneColors } from './use_tone_colors';
import {
  DISMISSAL_LABELS,
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STEP_LABELS,
  STEP_TONES,
  STRATEGY_ICONS,
  STRATEGY_LABELS,
} from './labels';

const VERDICT_COLORS: Record<string, string> = {
  confirms: 'success',
  refutes: 'danger',
  inconclusive: 'default',
  off_topic: 'warning',
};

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
  onClose: () => void;
}

/** One event view: why it is significant, its signals, its trail, and what to do with it. */
export function EventFlyout({ eventId, actions, onClose }: IEventFlyoutProps) {
  const { data, isLoading } = useDetectionEngineEvent(eventId);
  const { share } = useKibana().dependencies.start;
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const titleId = useGeneratedHtmlId();
  const toneColors = useToneColors();

  const discoverHref = (query: string, from: string) =>
    discoverLocator?.getRedirectUrl(
      buildDiscoverParams(query, {
        from: new Date(Date.parse(from) - 30 * 60_000).toISOString(),
        to: 'now',
      })
    );

  const event: EngineEvent | undefined = data?.event;

  const memberColumns: Array<EuiBasicTableColumn<EventMember>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.signal', {
        defaultMessage: 'Signal',
      }),
      render: (title: string, member: EventMember) => (
        <div>
          <EuiIcon type={STRATEGY_ICONS[member.strategy]} aria-hidden={true} />{' '}
          <strong>{title}</strong>
          <EuiText size="xs" color="subdued">
            {STRATEGY_LABELS[member.strategy]} · {member.service} · {member.join_reason}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'value',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.value', {
        defaultMessage: 'Now / normal up to',
      }),
      width: '140px',
      render: (value: number, member: EventMember) => (
        <span>
          {formatValue(value, member.unit)}
          {member.threshold !== undefined && (
            <EuiText size="xs" color="subdued">
              {formatValue(member.threshold, member.unit)}
            </EuiText>
          )}
        </span>
      ),
    },
    {
      field: 'healthy',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.health', {
        defaultMessage: 'Health',
      }),
      width: '100px',
      render: (healthy: boolean, member: EventMember) => (
        <EuiHealth color={healthy ? 'success' : 'danger'}>
          {healthy
            ? i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.healthy', {
                defaultMessage: 'Healthy ×{streak}',
                values: { streak: member.healthy_streak },
              })
            : i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.firing', {
                defaultMessage: 'Firing',
              })}
        </EuiHealth>
      ),
    },
    {
      field: 'verdict',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.verdict', {
        defaultMessage: 'Verdict',
      }),
      width: '110px',
      render: (verdict: EventMember['verdict']) =>
        verdict ? (
          <EuiBadge color={VERDICT_COLORS[verdict]}>{verdict}</EuiBadge>
        ) : (
          <EuiBadge color="hollow">
            {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.notChecked', {
              defaultMessage: 'not checked',
            })}
          </EuiBadge>
        ),
    },
    {
      field: 'evidence_esql',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.evidence', {
        defaultMessage: 'Evidence',
      }),
      width: '120px',
      render: (query: string, member: EventMember) => {
        const href = discoverHref(query, member.first_seen);
        return href ? (
          <EuiLink href={href} target="_blank" data-test-subj="detectionEngineEvidenceLink">
            {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.openDiscover', {
              defaultMessage: 'Open in Discover',
            })}
          </EuiLink>
        ) : null;
      },
    },
  ];

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
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color={SIGNIFICANT_EVENT_SEVERITY[event.severity].color}>
                  {SIGNIFICANT_EVENT_SEVERITY[event.severity].label}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHealth color={STATUS_COLORS[event.status]}>
                  {STATUS_LABELS[event.status]}
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.episode', {
                    defaultMessage: 'Occurrence {episode} · opened {opened}',
                    values: {
                      episode: event.episode,
                      opened: new Date(event.opened_at).toLocaleString(),
                    },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiTitle size="m">
              <h2 id={titleId}>{event.title}</h2>
            </EuiTitle>
          </>
        ) : (
          <EuiLoadingSpinner />
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading || !event || !data ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <>
            <EuiFlexGrid columns={4} gutterSize="s" data-test-subj="detectionEngineEventFacts">
              {[
                {
                  label: i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.factServices',
                    {
                      defaultMessage: 'Services',
                    }
                  ),
                  value: event.services.join(', '),
                },
                {
                  label: i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.factSignals',
                    {
                      defaultMessage: 'Signals',
                    }
                  ),
                  value: String(event.members.length),
                },
                {
                  label: i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.factAgent',
                    {
                      defaultMessage: 'Assessed by',
                    }
                  ),
                  value: event.assessment
                    ? event.assessment.agent === 'agent_builder'
                      ? event.assessment.connector_id ?? 'model'
                      : i18n.translate(
                          'xpack.significantEventsApp.detectionEngine.flyout.factHeuristic',
                          {
                            defaultMessage: 'heuristic agent',
                          }
                        )
                    : '-',
                },
                {
                  label: i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.factPublished',
                    {
                      defaultMessage: 'Alerting v2 alert',
                    }
                  ),
                  value: event.published
                    ? event.published.ok
                      ? i18n.translate(
                          'xpack.significantEventsApp.detectionEngine.flyout.factPublishedOk',
                          {
                            defaultMessage: 'published',
                          }
                        )
                      : event.published.error ?? ''
                    : i18n.translate(
                        'xpack.significantEventsApp.detectionEngine.flyout.factNotPublished',
                        {
                          defaultMessage: 'not published',
                        }
                      ),
                },
              ].map((fact) => (
                <EuiFlexItem key={fact.label}>
                  <EuiText size="xs" color="subdued">
                    {fact.label}
                  </EuiText>
                  <EuiText size="s">
                    <strong>{fact.value}</strong>
                  </EuiText>
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
            <EuiSpacer size="m" />
            <EuiPanel color="primary" paddingSize="m" hasShadow={false}>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.why', {
                    defaultMessage: 'Why this is significant',
                  })}
                </h3>
              </EuiTitle>
              <EuiText size="s">
                <p data-test-subj="detectionEngineEventSummary">{event.summary}</p>
              </EuiText>
            </EuiPanel>
            {event.assessment && (
              <>
                <EuiSpacer size="s" />
                <EuiAccordion
                  id="detectionEngineAssessment"
                  initialIsOpen={Boolean(event.assessment.severity_guard)}
                  buttonContent={
                    <EuiText size="s">
                      {i18n.translate(
                        'xpack.significantEventsApp.detectionEngine.flyout.howJudged',
                        {
                          defaultMessage: 'How the AI step judged it',
                        }
                      )}
                    </EuiText>
                  }
                  paddingSize="s"
                >
                  <EuiDescriptionList
                    compressed
                    type="column"
                    listItems={[
                      {
                        title: i18n.translate(
                          'xpack.significantEventsApp.detectionEngine.flyout.assessedBy',
                          { defaultMessage: 'Assessed by' }
                        ),
                        description: `${event.assessment.agent}${
                          event.assessment.connector_id ? ` (${event.assessment.connector_id})` : ''
                        } · ${new Date(event.assessment.at).toLocaleTimeString()}`,
                      },
                      {
                        title: i18n.translate(
                          'xpack.significantEventsApp.detectionEngine.flyout.severity',
                          { defaultMessage: 'Severity' }
                        ),
                        description: event.assessment.severity_guard
                          ? i18n.translate(
                              'xpack.significantEventsApp.detectionEngine.flyout.severityGuarded',
                              {
                                defaultMessage: 'Agent proposed {proposed}. {guard}',
                                values: {
                                  proposed: event.assessment.proposed_severity,
                                  guard: event.assessment.severity_guard,
                                },
                              }
                            )
                          : i18n.translate(
                              'xpack.significantEventsApp.detectionEngine.flyout.severityAgent',
                              {
                                defaultMessage: "The agent's judgment, from measured figures.",
                              }
                            ),
                      },
                      ...(event.assessment.explanation
                        ? [
                            {
                              title: i18n.translate(
                                'xpack.significantEventsApp.detectionEngine.flyout.agentNotes',
                                { defaultMessage: 'Agent and validation notes' }
                              ),
                              description: event.assessment.explanation,
                            },
                          ]
                        : []),
                    ]}
                  />
                </EuiAccordion>
              </>
            )}
            <EuiSpacer size="m" />
            {event.verification && (
              <>
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color={event.verification.holds ? 'success' : 'warning'}
                  iconType={event.verification.holds ? 'check' : 'warning'}
                  title={i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.verification',
                    {
                      defaultMessage: 'Verifier ({trigger}): {details}',
                      values: {
                        trigger: event.verification.trigger,
                        details: event.verification.details,
                      },
                    }
                  )}
                />
                <EuiSpacer size="m" />
              </>
            )}
            {event.dismissal && (
              <>
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color="warning"
                  iconType="eyeClosed"
                  title={i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.flyout.dismissalHold',
                    {
                      defaultMessage:
                        'Dismissed as {reason}. It stays quiet until the problem gets worse than when it was dismissed.',
                      values: { reason: DISMISSAL_LABELS[event.dismissal.reason] },
                    }
                  )}
                />
                <EuiSpacer size="m" />
              </>
            )}
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.signals', {
                  defaultMessage: 'Signals ({count})',
                  values: { count: event.members.length },
                })}
              </h3>
            </EuiTitle>
            <EuiBasicTable
              tableCaption={i18n.translate(
                'xpack.significantEventsApp.detectionEngine.flyout.signalsCaption',
                { defaultMessage: 'Signals in this event' }
              )}
              items={event.members}
              columns={memberColumns}
              data-test-subj="detectionEngineEventSignals"
            />
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.detections', {
                  defaultMessage: 'Detections behind it ({count})',
                  values: { count: data.detections.length },
                })}
              </h3>
            </EuiTitle>
            <EuiText size="xs">
              {data.detections.slice(0, 30).map((detection) => (
                <div key={detection.detection_id}>
                  {new Date(detection.bucket_start).toLocaleTimeString()}{' '}
                  <EuiBadge color={OUTCOME_COLORS[detection.outcome]}>
                    {OUTCOME_LABELS[detection.outcome]}
                  </EuiBadge>{' '}
                  {detection.title}: {detection.outcome_reason}
                </div>
              ))}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.significantEventsApp.detectionEngine.flyout.timeline', {
                  defaultMessage: 'Timeline: what the engine did and why',
                })}
              </h3>
            </EuiTitle>
            <EuiText size="xs" data-test-subj="detectionEngineEventTimeline">
              {[...data.activity].reverse().map((entry, index) => (
                <div
                  key={`${entry['@timestamp']}-${index}`}
                  style={{
                    backgroundColor: toneColors[STEP_TONES[entry.step]].background,
                    borderLeft: `3px solid ${toneColors[STEP_TONES[entry.step]].border}`,
                    padding: '2px 6px',
                    marginBottom: 2,
                    borderRadius: 4,
                  }}
                >
                  {new Date(entry['@timestamp']).toLocaleTimeString()}{' '}
                  <strong>{STEP_LABELS[entry.step]}</strong> {entry.message}
                </div>
              ))}
            </EuiText>
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

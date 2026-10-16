/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EngineEvent } from '@kbn/significant-events-detection-engine-plugin/common';
import React, { useState } from 'react';
import { SIGNIFICANT_EVENT_SEVERITY } from '../severity_badge/severity_badge';
import { latestWindow, reactionOf } from './event_reaction';
import { formatAgo, formatDuration, formatTime } from './format';
import {
  CLOSE_REASON_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STRATEGY_ICONS,
  STRATEGY_LABELS,
} from './labels';
import { useNow } from './use_now';

type TStatusFilter = 'open' | 'closed' | 'all';

/** A short line under the status: what keeps it open, or how it ended. */
function statusLine({
  event,
  quietPeriodBuckets,
  now,
}: {
  event: EngineEvent;
  quietPeriodBuckets: number;
  now: number;
}): string {
  if (event.status === 'active') {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.events.firingLine', {
      defaultMessage: '{firing} of {total} signals above normal',
      values: {
        firing: event.members.filter((member) => !member.healthy).length,
        total: event.members.length,
      },
    });
  }
  if (event.status === 'recovering') {
    const streak = Math.min(...event.members.map((member) => member.healthy_streak));
    return i18n.translate('xpack.significantEventsApp.detectionEngine.events.recoveringLine', {
      defaultMessage: 'normal {streak} of {quiet} min needed to close',
      values: { streak: Number.isFinite(streak) ? streak : 0, quiet: quietPeriodBuckets },
    });
  }
  return `${event.close_reason ? CLOSE_REASON_LABELS[event.close_reason] : ''}${
    event.closed_at ? ` ${formatAgo(event.closed_at, now)}` : ''
  }`;
}

interface IEventsTableProps {
  events: EngineEvent[];
  isLoading: boolean;
  quietPeriodBuckets: number;
  onOpenEvent: (eventId: string) => void;
}

/** Significant events raised by the engine, open ones first; each opens the event view. */
export function EventsTable({
  events,
  isLoading,
  quietPeriodBuckets,
  onOpenEvent,
}: IEventsTableProps) {
  const now = useNow(15_000);
  const openCount = events.filter((event) => event.status !== 'inactive').length;
  const [filter, setFilter] = useState<TStatusFilter | undefined>();
  // Until someone picks a filter, open events are what matters, if there are any.
  const effectiveFilter = filter ?? (openCount > 0 ? 'open' : 'all');
  const shown = events
    .filter((event) =>
      effectiveFilter === 'all'
        ? true
        : effectiveFilter === 'open'
        ? event.status !== 'inactive'
        : event.status === 'inactive'
    )
    .sort(
      (a, b) =>
        Number(a.status === 'inactive') - Number(b.status === 'inactive') ||
        b.opened_at.localeCompare(a.opened_at)
    );

  const columns: Array<EuiBasicTableColumn<EngineEvent>> = [
    {
      field: 'severity',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.severity', {
        defaultMessage: 'Severity',
      }),
      width: '90px',
      render: (severity: EngineEvent['severity']) => (
        <EuiBadge color={SIGNIFICANT_EVENT_SEVERITY[severity].color}>
          {SIGNIFICANT_EVENT_SEVERITY[severity].label}
        </EuiBadge>
      ),
    },
    {
      field: 'title',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.title', {
        defaultMessage: 'What happened',
      }),
      render: (title: string, event: EngineEvent) => {
        // The first signal's own title tells two similarly named events apart.
        const firstSignal = event.members[0]?.title;
        return (
          <div>
            <EuiLink
              onClick={() => onOpenEvent(event.event_id)}
              data-test-subj={`detectionEngineEventLink-${event.event_id}`}
            >
              <strong>{title}</strong>
            </EuiLink>
            {firstSignal && firstSignal !== title && (
              <EuiText size="xs" color="subdued">
                {event.members.length > 1
                  ? i18n.translate('xpack.significantEventsApp.detectionEngine.events.signals', {
                      defaultMessage: '{signal} and {more} more',
                      values: { signal: firstSignal, more: event.members.length - 1 },
                    })
                  : firstSignal}
              </EuiText>
            )}
            <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
              {event.services.map((service) => (
                <EuiFlexItem grow={false} key={service}>
                  <EuiBadge color="hollow">{service}</EuiBadge>
                </EuiFlexItem>
              ))}
              {[...new Set(event.members.map((member) => member.strategy))].map((strategy) => (
                <EuiFlexItem grow={false} key={strategy}>
                  <EuiIconTip
                    content={STRATEGY_LABELS[strategy]}
                    type={STRATEGY_ICONS[strategy]}
                    color="subdued"
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        );
      },
    },
    {
      field: 'status',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.status', {
        defaultMessage: 'Status',
      }),
      width: '190px',
      render: (status: EngineEvent['status'], event: EngineEvent) => (
        <div>
          <EuiHealth color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</EuiHealth>
          <EuiText size="xs" color="subdued">
            {statusLine({ event, quietPeriodBuckets, now })}
          </EuiText>
          {event.dismissal && (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.significantEventsApp.detectionEngine.events.dismissed', {
                defaultMessage: 'dismissed, held until worse',
              })}
            </EuiText>
          )}
          {event.episode > 1 && (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.significantEventsApp.detectionEngine.events.repeat', {
                defaultMessage: 'happened {count} times',
                values: { count: event.episode },
              })}
            </EuiText>
          )}
        </div>
      ),
    },
    {
      field: 'opened_at',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.started', {
        defaultMessage: 'Problem started',
      }),
      width: '120px',
      render: (openedAt: string) => (
        <div>
          <EuiText size="s">{formatTime(openedAt)}</EuiText>
          <EuiText size="xs" color="subdued">
            {formatAgo(openedAt, now)}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'open_windows',
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.significantEventsApp.detectionEngine.events.raisedAfterHelp',
            {
              defaultMessage:
                'From the start of the first minute that was above normal to the engine raising the event. Open an event to see where the time went.',
            }
          )}
        >
          <span tabIndex={0}>
            {i18n.translate('xpack.significantEventsApp.detectionEngine.events.raisedAfter', {
              defaultMessage: 'Raised after',
            })}{' '}
            <EuiIcon type="questionInCircle" color="subdued" aria-hidden={true} />
          </span>
        </EuiToolTip>
      ),
      width: '120px',
      render: (_windows: EngineEvent['open_windows'], event: EngineEvent) => {
        const window = latestWindow(event);
        const reaction = window ? reactionOf({ window }) : undefined;
        if (reaction?.raisedAt === undefined) {
          return (
            <EuiToolTip
              content={i18n.translate(
                'xpack.significantEventsApp.detectionEngine.events.raisedUnknown',
                {
                  defaultMessage:
                    'Raised before the engine recorded reaction times. Open the event to see it from the activity log.',
                }
              )}
            >
              <EuiText size="s" color="subdued" tabIndex={0}>
                -
              </EuiText>
            </EuiToolTip>
          );
        }
        return (
          <div>
            <EuiText size="s">{formatDuration(reaction.raisedAt - reaction.startedAt)}</EuiText>
            {reaction.isCatchUp && (
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.significantEventsApp.detectionEngine.events.catchUp', {
                  defaultMessage: 'while catching up',
                })}
              </EuiText>
            )}
          </div>
        );
      },
    },
    {
      field: 'verification',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.verifier', {
        defaultMessage: 'Re-checked',
      }),
      width: '90px',
      render: (verification: EngineEvent['verification']) =>
        verification ? (
          <EuiIconTip
            content={verification.details}
            type={verification.holds ? 'checkInCircleFilled' : 'warning'}
            color={verification.holds ? 'success' : 'danger'}
          />
        ) : (
          '-'
        ),
    },
  ];

  if (!isLoading && events.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="detectionEngineEventsEmpty"
        iconType="bell"
        titleSize="xs"
        title={
          <h4>
            {i18n.translate('xpack.significantEventsApp.detectionEngine.events.emptyTitle', {
              defaultMessage: 'No significant events yet',
            })}
          </h4>
        }
        body={
          <p>
            {i18n.translate('xpack.significantEventsApp.detectionEngine.events.empty', {
              defaultMessage:
                'That is the point on a healthy system. With Auto-run on, a problem in an enabled source shows up here within a few minutes.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <div data-test-subj="detectionEngineEvents">
      <EuiButtonGroup
        buttonSize="compressed"
        legend={i18n.translate('xpack.significantEventsApp.detectionEngine.events.filterLegend', {
          defaultMessage: 'Show events',
        })}
        idSelected={effectiveFilter}
        onChange={(id) => setFilter(id as TStatusFilter)}
        data-test-subj="detectionEngineEventsFilter"
        options={[
          {
            id: 'open',
            label: i18n.translate('xpack.significantEventsApp.detectionEngine.events.filterOpen', {
              defaultMessage: 'Open ({count})',
              values: { count: openCount },
            }),
          },
          {
            id: 'closed',
            label: i18n.translate(
              'xpack.significantEventsApp.detectionEngine.events.filterClosed',
              {
                defaultMessage: 'Closed ({count})',
                values: { count: events.length - openCount },
              }
            ),
          },
          {
            id: 'all',
            label: i18n.translate('xpack.significantEventsApp.detectionEngine.events.filterAll', {
              defaultMessage: 'All',
            }),
          },
        ]}
      />
      <EuiSpacer size="s" />
      <EuiBasicTable
        data-test-subj="detectionEngineEventsTable"
        tableCaption={i18n.translate('xpack.significantEventsApp.detectionEngine.events.caption', {
          defaultMessage: 'Significant events raised by the detection engine',
        })}
        items={shown}
        itemId="event_id"
        columns={columns}
        loading={isLoading}
        rowProps={(event: EngineEvent) => ({
          style: event.status === 'inactive' ? { opacity: 0.75 } : undefined,
        })}
        noItemsMessage={i18n.translate(
          'xpack.significantEventsApp.detectionEngine.events.noneForFilter',
          { defaultMessage: 'No events for this filter.' }
        )}
      />
    </div>
  );
}

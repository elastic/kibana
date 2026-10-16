/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIconTip,
  EuiLink,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EngineEvent } from '@kbn/significant-events-detection-engine-plugin/common';
import React from 'react';
import { SIGNIFICANT_EVENT_SEVERITY } from '../severity_badge/severity_badge';
import { formatAgo } from './format';
import { STATUS_COLORS, STATUS_LABELS, STRATEGY_ICONS, STRATEGY_LABELS } from './labels';
import { useNow } from './use_now';

interface IEventsTableProps {
  events: EngineEvent[];
  isLoading: boolean;
  onOpenEvent: (eventId: string) => void;
}

/** Significant events raised by the engine; each opens the same event view. */
export function EventsTable({ events, isLoading, onOpenEvent }: IEventsTableProps) {
  const now = useNow(15_000);

  const columns: Array<EuiBasicTableColumn<EngineEvent>> = [
    {
      field: 'severity',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.severity', {
        defaultMessage: 'Severity',
      }),
      width: '100px',
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
      render: (title: string, event: EngineEvent) => (
        <div>
          <EuiLink
            onClick={() => onOpenEvent(event.event_id)}
            data-test-subj={`detectionEngineEventLink-${event.event_id}`}
          >
            <strong>{title}</strong>
          </EuiLink>
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
      ),
    },
    {
      field: 'status',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.status', {
        defaultMessage: 'Status',
      }),
      width: '170px',
      render: (status: EngineEvent['status'], event: EngineEvent) => (
        <div>
          <EuiHealth color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</EuiHealth>
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
      field: 'members',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.signals', {
        defaultMessage: 'Signals',
      }),
      width: '80px',
      render: (members: EngineEvent['members']) => members.length,
    },
    {
      field: 'opened_at',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.opened', {
        defaultMessage: 'Opened',
      }),
      width: '120px',
      render: (openedAt: string) => formatAgo(openedAt, now),
    },
    {
      field: 'verification',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.events.verifier', {
        defaultMessage: 'Re-checked',
      }),
      width: '100px',
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
    <EuiBasicTable
      data-test-subj="detectionEngineEventsTable"
      tableCaption={i18n.translate('xpack.significantEventsApp.detectionEngine.events.caption', {
        defaultMessage: 'Significant events raised by the detection engine',
      })}
      items={events}
      columns={columns}
      loading={isLoading}
    />
  );
}

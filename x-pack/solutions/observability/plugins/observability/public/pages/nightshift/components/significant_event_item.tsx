/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';

export interface SignificantEventItemProps {
  event: SignificantEvent;
  onClick?: (event: SignificantEvent) => void;
}

const MAX_VISIBLE_STREAMS = 4;

function getStatusColor(status: SignificantEventStatus): string {
  switch (status) {
    case 'promoted':
    case 'acknowledged':
      return 'danger';
    case 'resolved':
    case 'closed':
      return 'success';
    case 'demoted':
      return 'subdued';
    default:
      return 'subdued';
  }
}

function getStatusLabel(status: SignificantEventStatus): string {
  switch (status) {
    case 'promoted':
      return 'Investigating';
    case 'acknowledged':
      return 'Investigating';
    case 'resolved':
      return 'Investigated';
    case 'closed':
      return 'Investigated';
    case 'demoted':
      return 'Dismissed';
    default:
      return status;
  }
}

function getInvestigationBadgeColor(status: SignificantEventStatus): string {
  switch (status) {
    case 'resolved':
    case 'closed':
      return '#E6F9F7';
    default:
      return 'hollow';
  }
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function SignificantEventItem({ event, onClick }: SignificantEventItemProps) {
  const relativeTime = formatRelativeTime(event['@timestamp']);
  const statusColor = getStatusColor(event.status);
  const statusLabel = getStatusLabel(event.status);
  const visibleStreams = event.stream_names.slice(0, MAX_VISIBLE_STREAMS);
  const overflowCount = event.stream_names.length - MAX_VISIBLE_STREAMS;

  return (
    <div
      onClick={onClick ? () => onClick(event) : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default', padding: '12px 16px' }}
      data-test-subj="nightshiftSignificantEventItem"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiHealth color={statusColor} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {relativeTime}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={getInvestigationBadgeColor(event.status)}>{statusLabel}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiText size="s" style={{ marginTop: 4 }}>
        <p style={{ margin: 0 }}>{event.title}</p>
      </EuiText>

      <EuiFlexGroup gutterSize="xs" wrap responsive={false} style={{ marginTop: 8 }}>
        {visibleStreams.map((name) => (
          <EuiFlexItem grow={false} key={name}>
            <EuiBadge color="hollow">{name}</EuiBadge>
          </EuiFlexItem>
        ))}
        {overflowCount > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">+{overflowCount}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
}

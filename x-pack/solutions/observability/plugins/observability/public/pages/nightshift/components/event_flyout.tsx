/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { DetectionsList } from './detections_list';

export interface EventFlyoutProps {
  event: SignificantEvent;
  onClose: () => void;
}

const MAX_SUMMARY_LENGTH = 300;

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.round(diff / 60000);

  let relative: string;
  if (minutes < 1) relative = 'just now';
  else if (minutes < 60) relative = `${minutes} minutes ago`;
  else if (minutes < 1440) relative = `${Math.round(minutes / 60)} hours ago`;
  else relative = `${Math.round(minutes / 1440)} days ago`;

  const formatted = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return `${formatted} (${relative})`;
}

function getStatusBadge(status: string): { label: string; color: string } {
  switch (status) {
    case 'promoted':
    case 'acknowledged':
      return { label: 'Needs action', color: '#FEE6E1' };
    case 'resolved':
    case 'closed':
      return { label: 'Resolved', color: '#E6F9F7' };
    case 'demoted':
      return { label: 'Dismissed', color: 'hollow' };
    default:
      return { label: status, color: 'hollow' };
  }
}

export function EventFlyout({ event, onClose }: EventFlyoutProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const statusBadge = getStatusBadge(event.status);

  const summaryTruncated =
    event.summary.length > MAX_SUMMARY_LENGTH && !summaryExpanded;
  const displaySummary = summaryTruncated
    ? event.summary.slice(0, MAX_SUMMARY_LENGTH) + '...'
    : event.summary;

  const toggleSummary = useCallback(() => {
    setSummaryExpanded((prev) => !prev);
  }, []);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      session="start"
      aria-label={event.title}
      data-test-subj="nightshiftEventFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{event.title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.nightshift.flyout.badge.significantEvent', {
                defaultMessage: 'Significant event',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={statusBadge.color}>{statusBadge.label}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {formatTimestamp(event['@timestamp'])}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.nightshift.flyout.summary.title', {
              defaultMessage: 'Summary',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>{displaySummary}</p>
        </EuiText>
        {event.summary.length > MAX_SUMMARY_LENGTH && (
          <EuiLink onClick={toggleSummary}>
            {summaryExpanded
              ? i18n.translate('xpack.nightshift.flyout.summary.showLess', {
                  defaultMessage: 'Show less',
                })
              : i18n.translate('xpack.nightshift.flyout.summary.showMore', {
                  defaultMessage: 'Show more',
                })}
          </EuiLink>
        )}

        <EuiSpacer size="l" />

        <DetectionsList event={event} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

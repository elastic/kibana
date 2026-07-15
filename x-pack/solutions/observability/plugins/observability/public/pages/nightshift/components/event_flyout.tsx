/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';
import { DetectionsList } from './detections_list';
import { EventInvestigations } from './event_investigations';
import { InvestigationStatusBadge } from './investigation_status_badge';

export interface EventFlyoutProps {
  event: SignificantEvent;
  onClose: () => void;
  onChatClick?: (event: SignificantEvent) => void;
}

const MAX_SUMMARY_LENGTH = 300;
const TIMESTAMP_FORMAT = 'MMM D, YYYY @ HH:mm:ss';

function getStatusBadge(
  status: SignificantEventStatus,
  euiTheme: UseEuiTheme['euiTheme']
): { label: string; color: string } {
  switch (status) {
    case 'promoted':
    case 'acknowledged':
      return {
        label: i18n.translate('xpack.observability.nightshift.flyout.badge.needsActionLabel', {
          defaultMessage: 'Needs action',
        }),
        color: euiTheme.colors.backgroundLightDanger,
      };
    case 'resolved':
    case 'closed':
      return {
        label: i18n.translate('xpack.observability.nightshift.flyout.badge.resolvedLabel', {
          defaultMessage: 'Resolved',
        }),
        color: euiTheme.colors.backgroundLightSuccess,
      };
    case 'demoted':
      return {
        label: i18n.translate('xpack.observability.nightshift.flyout.badge.dismissedLabel', {
          defaultMessage: 'Dismissed',
        }),
        color: 'hollow',
      };
  }
}

export function EventFlyout({ event, onClose, onChatClick }: EventFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const statusBadge = getStatusBadge(event.status, euiTheme);

  const summaryTruncated = event.summary.length > MAX_SUMMARY_LENGTH && !summaryExpanded;
  const displaySummary = summaryTruncated
    ? event.summary.slice(0, MAX_SUMMARY_LENGTH) + '...'
    : event.summary;

  const toggleSummary = useCallback(() => {
    setSummaryExpanded((prev) => !prev);
  }, []);

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      type="push"
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
              {i18n.translate('xpack.observability.nightshift.flyout.badge.significantEventLabel', {
                defaultMessage: 'Significant event',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={statusBadge.color}>{statusBadge.label}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <InvestigationStatusBadge status={event.status} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {moment(event['@timestamp']).format(TIMESTAMP_FORMAT)}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.observability.nightshift.flyout.summaryTitle', {
              defaultMessage: 'Summary',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>{displaySummary}</p>
        </EuiText>
        {event.summary.length > MAX_SUMMARY_LENGTH && (
          <EuiLink data-test-subj="o11yEventFlyoutLink" onClick={toggleSummary}>
            {summaryExpanded
              ? i18n.translate('xpack.observability.nightshift.flyout.showLessButtonText', {
                  defaultMessage: 'Show less',
                })
              : i18n.translate('xpack.observability.nightshift.flyout.showMoreButtonText', {
                  defaultMessage: 'Show more',
                })}
          </EuiLink>
        )}

        <EuiSpacer size="l" />

        <DetectionsList event={event} />

        <EuiSpacer size="l" />

        <EventInvestigations event={event} />
      </EuiFlyoutBody>

      {onChatClick && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <AiButton
                variant="base"
                iconType="productAgent"
                data-test-subj="nightshiftEventFlyoutChatButton"
                onClick={() => onChatClick(event)}
              >
                {i18n.translate('xpack.observability.nightshift.flyout.openInChatButtonLabel', {
                  defaultMessage: 'Open in chat',
                })}
              </AiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}

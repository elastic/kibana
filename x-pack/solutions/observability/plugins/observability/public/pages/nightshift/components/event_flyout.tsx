/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { LifecycleDetection, SignificantEvent } from '@kbn/significant-events-schema';
import { DetectionFlyout } from './detection_flyout';
import { DetectionsList } from './detections_list';
import { EventInvestigation } from './event_investigation';
import { InvestigationStatusBadge } from './investigation_status_badge';
import { formatTimestamp } from '../format_timestamp';
import { isNeedsActionStatus } from '../significant_event_status';

export interface EventFlyoutProps {
  event: SignificantEvent;
  onClose: () => void;
  onChatClick?: (event: SignificantEvent) => void;
}

const MAX_SUMMARY_LENGTH = 300;

export function EventFlyout({ event, onClose, onChatClick }: EventFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState<LifecycleDetection | undefined>();

  // Signal collected by the discovery agent for the selected detection's rule.
  const selectedDetectionSignal = useMemo(() => {
    if (!selectedDetection) {
      return undefined;
    }
    return event.signals?.find(
      (signal) =>
        signal.type === 'detection' &&
        ((selectedDetection.rule_uuid != null &&
          signal.metadata.rule_uuid === selectedDetection.rule_uuid) ||
          (selectedDetection.rule_name != null &&
            signal.metadata.rule_name === selectedDetection.rule_name) ||
          signal.metadata.detection_id === selectedDetection.detection_id)
    );
  }, [event, selectedDetection]);

  const closeDetectionFlyout = useCallback(() => {
    setSelectedDetection(undefined);
  }, []);

  // Code points, not UTF-16 units, so truncation cannot split an emoji in half.
  const summaryCharacters = useMemo(() => Array.from(event.summary), [event.summary]);
  const isSummaryLong = summaryCharacters.length > MAX_SUMMARY_LENGTH;
  const displaySummary =
    isSummaryLong && !summaryExpanded
      ? summaryCharacters.slice(0, MAX_SUMMARY_LENGTH).join('') + '...'
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
            <EuiBadge color="default">
              {i18n.translate('xpack.observability.nightshift.flyout.badge.significantEventLabel', {
                defaultMessage: 'Significant event',
              })}
            </EuiBadge>
          </EuiFlexItem>
          {isNeedsActionStatus(event.status) && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={euiTheme.colors.backgroundLightDanger}
                css={css`
                  /* EuiBadge derives an inline black/white text color from the
                     custom background; the design wants danger-red text. */
                  color: ${euiTheme.colors.textDanger} !important;
                `}
              >
                {i18n.translate('xpack.observability.nightshift.flyout.badge.needsActionLabel', {
                  defaultMessage: 'Needs action',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <InvestigationStatusBadge status={event.status} />
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
            {i18n.translate('xpack.observability.nightshift.flyout.summaryTitle', {
              defaultMessage: 'Summary',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>{displaySummary}</p>
        </EuiText>
        {isSummaryLong && (
          // eslint-disable-next-line @elastic/eui/require-href-for-link
          <EuiLink data-test-subj="nightshiftEventFlyoutSummaryToggle" onClick={toggleSummary}>
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

        <DetectionsList
          eventUuid={event.event_uuid}
          selectedDetectionId={selectedDetection?.detection_id}
          onDetectionClick={setSelectedDetection}
        />

        <EuiSpacer size="l" />

        <EventInvestigation event={event} />
      </EuiFlyoutBody>

      {selectedDetection && (
        // Remount when switching detections so per-detection UI state never leaks.
        <DetectionFlyout
          key={selectedDetection.detection_id}
          detection={selectedDetection}
          event={event}
          signal={selectedDetectionSignal}
          onClose={closeDetectionFlyout}
        />
      )}

      {onChatClick && (
        <EuiFlyoutFooter
          css={css`
            /* The design uses a plain footer instead of EUI's shaded one. */
            background: ${euiTheme.colors.backgroundBasePlain};
            border-top: ${euiTheme.border.thin};
          `}
        >
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <AiButton
                variant="base"
                size="s"
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

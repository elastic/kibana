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
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { DetectionFlyout } from './detection_flyout';
import { DetectionsList } from './detections_list';
import { EventInvestigation } from './event_investigation';
import { InvestigationStatusBadge } from './investigation_status_badge';
import { TruncatableSummary } from './truncatable_summary';
import { formatTimestamp } from '../format_timestamp';
import { useFetchEventLifecycle } from '../hooks/use_fetch_event_lifecycle';
import { findDetectionSignal } from '../resolve_detection_signal';
import { isNeedsActionStatus } from '../significant_event_status';

export interface EventFlyoutProps {
  event: SignificantEvent;
  onClose: () => void;
  onChatClick?: (event: SignificantEvent) => void;
}

export function EventFlyout({ event, onClose, onChatClick }: EventFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [selectedDetectionId, setSelectedDetectionId] = useState<string>();
  const lifecycleQuery = useFetchEventLifecycle(event.event_uuid);

  const selectedDetection = useMemo(
    () =>
      lifecycleQuery.data?.detections.find(
        (detection) => detection.detection_id === selectedDetectionId
      ),
    [lifecycleQuery.data?.detections, selectedDetectionId]
  );

  const selectedDetectionSignal = useMemo(() => {
    if (!selectedDetection) {
      return undefined;
    }
    return findDetectionSignal(selectedDetection, {
      discoveries: lifecycleQuery.data?.discoveries,
      eventSignals: event.signals,
    });
  }, [event.signals, lifecycleQuery.data?.discoveries, selectedDetection]);

  const closeDetectionFlyout = useCallback(() => {
    setSelectedDetectionId(undefined);
  }, []);

  const handleDetectionClick = useCallback((detectionId: string) => {
    setSelectedDetectionId((current) => (current === detectionId ? undefined : detectionId));
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
                defaultMessage: 'Significant Event',
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
        <TruncatableSummary summary={event.summary} />

        <EuiSpacer size="l" />

        <DetectionsList
          eventUuid={event.event_uuid}
          lifecycleQuery={lifecycleQuery}
          selectedDetectionId={selectedDetectionId}
          onDetectionClick={(detection) => handleDetectionClick(detection.detection_id)}
        />

        <EuiSpacer size="l" />

        <EventInvestigation event={event} />
      </EuiFlyoutBody>

      {selectedDetection && (
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

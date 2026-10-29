/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { describeSkip, type Detection } from '@kbn/significant-events-schema';
import { formatTimestamp } from '../../../../util/formatters';

/**
 * Where a detection stands with discovery: skipped by the classifier (with why on hover), or
 * processed by the agent, or still pending.
 */
export const DetectionDiscoveryStatus = ({
  detection,
}: {
  detection: Pick<Detection, 'processed' | 'skip'>;
}) => {
  const { processed, skip } = detection;

  if (skip) {
    return (
      <EuiToolTip
        position="top"
        title={i18n.translate('xpack.significantEventsApp.detectionStatus.skippedTooltipTitle', {
          defaultMessage: 'Skipped: no new analysis needed',
        })}
        content={describeSkip(skip, formatTimestamp).map((line) => (
          <p key={line}>{line}</p>
        ))}
      >
        <EuiBadge
          color="primary"
          tabIndex={0}
          data-test-subj="significantEventsAppDetectionSkippedBadge"
        >
          {i18n.translate('xpack.significantEventsApp.detectionStatus.skipped', {
            defaultMessage: 'Skipped',
          })}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  return processed ? (
    <EuiBadge color="success">
      {i18n.translate('xpack.significantEventsApp.detectionFlyout.status.processed', {
        defaultMessage: 'Processed',
      })}
    </EuiBadge>
  ) : (
    <EuiBadge color="hollow">
      {i18n.translate('xpack.significantEventsApp.detectionFlyout.status.pending', {
        defaultMessage: 'Pending',
      })}
    </EuiBadge>
  );
};

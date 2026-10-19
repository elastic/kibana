/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Detection, SkipReason } from '@kbn/significant-events-schema';
import { formatTimestamp } from '../../../../util/formatters';

const SKIP_REASON_LABELS: Readonly<Record<SkipReason, string>> = {
  still_breaching: i18n.translate(
    'xpack.significantEventsApp.detectionStatus.reason.stillBreaching',
    {
      defaultMessage:
        "The rule's query still matches in the current window and the event already records it as breaching, so nothing changed.",
    }
  ),
  still_healthy: i18n.translate('xpack.significantEventsApp.detectionStatus.reason.stillHealthy', {
    defaultMessage:
      "The rule's query returns nothing in the current window and the event already records it as healthy, so nothing changed.",
  }),
};

// Stored markers can carry a reason this build does not know.
const labelsByStoredReason: Readonly<Record<string, string>> = SKIP_REASON_LABELS;

const getSkipReasonLabel = (reason: string): string => labelsByStoredReason[reason] ?? reason;

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
        content={
          <>
            <p>{getSkipReasonLabel(skip.reason)}</p>
            {skip.checked_at && (
              <p>
                {i18n.translate('xpack.significantEventsApp.detectionStatus.checkedAt', {
                  defaultMessage: 'Checked {time}',
                  values: { time: formatTimestamp(skip.checked_at) },
                })}
              </p>
            )}
          </>
        }
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
      {i18n.translate('xpack.significantEventsApp.detectionStatus.processed', {
        defaultMessage: 'Processed',
      })}
    </EuiBadge>
  ) : (
    <EuiBadge color="hollow">
      {i18n.translate('xpack.significantEventsApp.detectionStatus.pending', {
        defaultMessage: 'Pending',
      })}
    </EuiBadge>
  );
};

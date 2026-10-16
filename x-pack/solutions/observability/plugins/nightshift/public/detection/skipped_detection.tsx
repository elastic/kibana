/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DetectionSkip } from '@kbn/significant-events-schema';
import { useFormatTimestamp } from '../common/format_timestamp';

const SKIP_REASON_LABELS: Record<string, string> = {
  still_breaching: i18n.translate('xpack.nightshift.skippedDetection.reason.stillBreaching', {
    defaultMessage:
      "The rule's query still matches in the current window and the event already records it as breaching, so nothing changed.",
  }),
  still_healthy: i18n.translate('xpack.nightshift.skippedDetection.reason.stillHealthy', {
    defaultMessage:
      "The rule's query returns nothing in the current window and the event already records it as healthy, so nothing changed.",
  }),
};

/** What the classifier decided, in words: its reason, or the reason as stored when it is unknown. */
export const getSkipReasonLabel = ({ reason }: Pick<DetectionSkip, 'reason'>): string =>
  SKIP_REASON_LABELS[reason] ?? reason;

/** A detection the classifier closed without the discovery agent, with why on hover. */
export function SkippedDetectionBadge({ skip }: { skip: DetectionSkip }) {
  const formatTimestamp = useFormatTimestamp();

  return (
    <EuiToolTip
      position="top"
      title={i18n.translate('xpack.nightshift.skippedDetection.tooltipTitle', {
        defaultMessage: 'Skipped: no new analysis needed',
      })}
      content={
        <>
          <p>{getSkipReasonLabel(skip)}</p>
          {skip.checked_at && (
            <p>
              {i18n.translate('xpack.nightshift.skippedDetection.checkedAt', {
                defaultMessage: 'Checked {time}',
                values: { time: formatTimestamp(skip.checked_at) },
              })}
            </p>
          )}
        </>
      }
    >
      <EuiBadge
        color="hollow"
        iconType="eyeClosed"
        tabIndex={0}
        data-test-subj="nightshiftSkippedDetectionBadge"
      >
        {i18n.translate('xpack.nightshift.skippedDetection.badge', {
          defaultMessage: 'Skipped',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}

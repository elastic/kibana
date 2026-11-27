/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { describeSkip, type DetectionSkip } from '@kbn/significant-events-schema';
import { useFormatTimestamp } from '../../../hooks/use_format_timestamp';

export const SKIPPED_DETECTION_LABEL = i18n.translate('xpack.nightshift.skippedDetection.badge', {
  defaultMessage: 'Skipped',
});

export const SkippedDetectionReason = ({ skip }: { skip: DetectionSkip }) => {
  const formatTimestamp = useFormatTimestamp();

  return describeSkip(skip, formatTimestamp).map((line) => <p key={line}>{line}</p>);
};

/** A detection the classifier closed without the discovery agent, with why on hover. */
export function SkippedDetectionBadge({ skip }: { skip: DetectionSkip }) {
  return (
    <EuiToolTip
      position="top"
      title={i18n.translate('xpack.nightshift.skippedDetection.tooltipTitle', {
        defaultMessage: 'Skipped: no new analysis needed',
      })}
      content={<SkippedDetectionReason skip={skip} />}
    >
      <EuiBadge color="primary" tabIndex={0} data-test-subj="nightshiftSkippedDetectionBadge">
        {SKIPPED_DETECTION_LABEL}
      </EuiBadge>
    </EuiToolTip>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Detection } from '@kbn/significant-events-schema';
import { SKIPPED_DETECTION_LABEL, SkippedDetectionBadge } from './skipped_detection';

type DiscoveryStatusInput = Pick<Detection, 'processed' | 'skip'>;

const PROCESSED_LABEL = i18n.translate('xpack.nightshift.detectionDiscoveryStatus.processed', {
  defaultMessage: 'Processed',
});
const PENDING_LABEL = i18n.translate('xpack.nightshift.detectionDiscoveryStatus.pending', {
  defaultMessage: 'Pending',
});

export const getDetectionDiscoveryBadge = (
  detection: DiscoveryStatusInput
): { label: string; color: 'primary' | 'success' | 'hollow' } => {
  if (detection.skip) {
    return { label: SKIPPED_DETECTION_LABEL, color: 'primary' };
  }
  if (detection.processed) {
    return { label: PROCESSED_LABEL, color: 'success' };
  }
  return { label: PENDING_LABEL, color: 'hollow' };
};

export const DetectionDiscoveryStatus = ({
  detection,
}: {
  detection: DiscoveryStatusInput;
}): React.ReactElement => {
  if (detection.skip) {
    return <SkippedDetectionBadge skip={detection.skip} />;
  }

  const badge = getDetectionDiscoveryBadge(detection);
  return <EuiBadge color={badge.color}>{badge.label}</EuiBadge>;
};

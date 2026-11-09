/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiHealth, EuiIcon, EuiSkeletonRectangle, EuiToolTip } from '@elastic/eui';
import type { SignificantEventsMaintenanceStatus } from '@kbn/significant-events-plugin/common';
import React from 'react';
import {
  MONITORING_STATUS_LABEL,
  PAUSED_STATUS_LABEL,
  STATUS_ERROR_TOOLTIP,
  STATUS_LOADING_LABEL,
  UNKNOWN_STATUS_LABEL,
} from './translations';

export interface DetectionStatusBadgeProps {
  status: SignificantEventsMaintenanceStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  'data-test-subj'?: string;
}

export const DetectionStatusBadge = ({
  status,
  isLoading,
  isError,
  'data-test-subj': dataTestSubj = 'nightshiftDetectionStatus',
}: DetectionStatusBadgeProps): React.ReactElement => {
  if (isLoading) {
    return (
      <EuiSkeletonRectangle
        width={72}
        height={20}
        borderRadius="s"
        contentAriaLabel={STATUS_LOADING_LABEL}
      />
    );
  }

  if (isError || !status) {
    return (
      <EuiToolTip content={STATUS_ERROR_TOOLTIP}>
        <EuiHealth color="subdued" data-test-subj={`${dataTestSubj}Unknown`}>
          {UNKNOWN_STATUS_LABEL}
        </EuiHealth>
      </EuiToolTip>
    );
  }

  const isPaused = status.state === 'paused';
  return (
    <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
      <EuiIcon type="dot" color={isPaused ? 'warning' : 'primary'} aria-hidden={true} />{' '}
      {isPaused ? PAUSED_STATUS_LABEL : MONITORING_STATUS_LABEL}
    </EuiBadge>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import {
  getPausedDetectionCalloutBody,
  getPausedDetectionCalloutTitle,
} from '@kbn/significant-events-plugin/common';
import { useMaintenanceStatus } from '../hooks/use_significant_events_maintenance';

export function DetectionPausedCallout() {
  const { data: status } = useMaintenanceStatus();

  if (status?.state !== 'paused') {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        data-test-subj="streams-settings-maintenance-paused-status"
        title={getPausedDetectionCalloutTitle(status)}
        text={getPausedDetectionCalloutBody()}
      />
      <EuiSpacer />
    </>
  );
}

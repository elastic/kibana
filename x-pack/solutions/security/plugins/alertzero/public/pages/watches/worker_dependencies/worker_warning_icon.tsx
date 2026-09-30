/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import type { WorkerWarningReason } from './worker_dependencies';
import { WorkerWarningContent } from './worker_warning_content';
import * as i18n from './translations';

interface WorkerWarningIconProps {
  workerId: string;
  workerName: string;
  reasons: WorkerWarningReason[];
}

/** The single warning icon on a Worker header; renders nothing while there is no reason. */
export const WorkerWarningIcon: React.FC<WorkerWarningIconProps> = ({
  workerId,
  workerName,
  reasons,
}) => {
  if (reasons.length === 0) {
    return null;
  }
  return (
    <EuiIconTip
      type="warning"
      color="warning"
      size="m"
      aria-label={i18n.workerWarningAriaLabel(workerName)}
      content={<WorkerWarningContent reasons={reasons} />}
      iconProps={{ 'data-test-subj': `alertZeroWorkerWarningIcon-${workerId}` }}
    />
  );
};

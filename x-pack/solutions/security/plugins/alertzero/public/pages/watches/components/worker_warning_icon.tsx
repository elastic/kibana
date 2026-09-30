/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import * as settingsI18n from '../settings_translations';
import { WorkerWarningContent, type WorkerWarningReason } from './worker_warning_content';

interface WorkerWarningIconProps {
  workerId: string;
  workerName: string;
  /** Non-empty; the header renders no icon at all when there is nothing to explain. */
  reasons: WorkerWarningReason[];
}

/** The single warning icon on a Worker header. */
export const WorkerWarningIcon: React.FC<WorkerWarningIconProps> = ({
  workerId,
  workerName,
  reasons,
}) => (
  <EuiIconTip
    type="warning"
    color="warning"
    size="m"
    aria-label={settingsI18n.workerWarningAriaLabel(workerName)}
    content={<WorkerWarningContent reasons={reasons} />}
    iconProps={{ 'data-test-subj': `alertZeroWorkerWarningIcon-${workerId}` }}
  />
);

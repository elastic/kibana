/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID } from '@kbn/alertzero-common';
import type { AlertZeroTriggerType, AlertZeroWorkerId } from '../constants';

/**
 * The Workers whose YAML acts at the configured autonomy (`consts.worker_settings.autonomy`) only
 * for some triggers, keyed by catalog Worker id, with the trigger types that use it. A run started
 * any other way acts at another level, so the envelope leaves the autonomy fields out. A Worker not
 * listed here acts at its configured autonomy whatever the trigger.
 */
export const CONFIGURED_AUTONOMY_TRIGGER_TYPES: Readonly<
  Partial<Record<AlertZeroWorkerId, readonly AlertZeroTriggerType[]>>
> = {
  // `set_ki_autonomy` in `forensics_endpoint_analysis.yaml` writes the configured level for the
  // analysis only when `execution.triggeredBy == 'scheduled'`, and `manual` for any other trigger.
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: ['scheduled'],
};

/** Whether a run of `workerId` started by `triggerType` acts at the Worker's configured autonomy. */
export const usesConfiguredAutonomy = ({
  triggerType,
  workerId,
}: {
  triggerType: AlertZeroTriggerType;
  workerId: AlertZeroWorkerId;
}): boolean => {
  const triggerTypes = CONFIGURED_AUTONOMY_TRIGGER_TYPES[workerId];
  return triggerTypes === undefined || triggerTypes.includes(triggerType);
};

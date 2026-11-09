/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';

/** Log a maintenance outcome: one warning per failure, or a single info line when clean. */
export const logFailures = (
  log: Logger,
  message: string,
  failures: SignificantEventsMaintenanceFailure[]
): void => {
  if (failures.length > 0) {
    log.warn(message);
    for (const failure of failures) {
      log.warn(`Significant Events maintenance failure [${failure.target}]: ${failure.error}`);
    }
  } else {
    log.info(message);
  }
};

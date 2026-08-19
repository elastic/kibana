/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowStatus } from '../../../common/workflows/triggers/constants';
import { MAX_ALERTS_PER_TRIGGER } from '../../../common/workflows/triggers';
import type { SecuritySolutionEventBus } from '../../events/event_bus';

// Cases is multi-owner; only forward events for alerts that live in Security indices.
const SECURITY_ALERT_INDEX_PREFIX = '.alerts-security.';

interface CasesAlertStatusPayload {
  readonly alertIds: readonly string[];
  readonly status: WorkflowStatus;
  readonly previousStatuses: ReadonlyArray<{
    readonly id: string;
    readonly previousStatus: WorkflowStatus;
  }>;
  readonly indices: readonly string[];
}

export const forwardCasesAlertStatusToSS = (
  securityEventBus: SecuritySolutionEventBus,
  logger: Logger,
  request: KibanaRequest,
  payload: CasesAlertStatusPayload
): void => {
  if (!payload.indices.some((index) => index.startsWith(SECURITY_ALERT_INDEX_PREFIX))) {
    return;
  }
  try {
    void securityEventBus.emitAlertStatusChanged(request, {
      alertIds: payload.alertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
      status: payload.status,
      previousStatuses: payload.previousStatuses.slice(0, MAX_ALERTS_PER_TRIGGER),
      truncated: payload.alertIds.length > MAX_ALERTS_PER_TRIGGER,
    });
  } catch (err) {
    logger.warn(`Failed to forward Cases alertStatusChanged event to workflow triggers: ${err}`);
  }
};

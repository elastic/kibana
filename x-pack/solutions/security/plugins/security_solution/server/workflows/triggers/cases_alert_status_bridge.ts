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
// Detection alerts land in a concrete backing index (.internal.alerts-security.*),
// not the read alias (.alerts-security.*), so we need to match both.
const SECURITY_ALERT_BACKING_INDEX_PREFIX = '.internal.alerts-security.';
// Legacy pre-rules-framework signals.
const SIEM_SIGNALS_INDEX_PREFIX = '.siem-signals';

interface CasesAlertStatusPayload {
  readonly alertIds: readonly string[];
  readonly status: WorkflowStatus;
  readonly previousStatuses: ReadonlyArray<{
    readonly id: string;
    readonly previousStatus: WorkflowStatus;
  }>;
  readonly alertIdToIndex: Readonly<Record<string, string>>;
  readonly indices: readonly string[];
}

const isSecurityIndex = (index: string): boolean =>
  index.startsWith(SECURITY_ALERT_INDEX_PREFIX) ||
  index.startsWith(SECURITY_ALERT_BACKING_INDEX_PREFIX) ||
  index.startsWith(SIEM_SIGNALS_INDEX_PREFIX);

export const forwardCasesAlertStatusToSecuritySolution = (
  securitySolutionEventBus: SecuritySolutionEventBus,
  logger: Logger,
  request: KibanaRequest,
  payload: CasesAlertStatusPayload
): void => {
  const securityAlertIds = payload.alertIds.filter((id) => {
    const index = payload.alertIdToIndex[id];
    return index !== undefined && isSecurityIndex(index);
  });
  if (securityAlertIds.length === 0) {
    return;
  }
  const securityIdSet = new Set(securityAlertIds);
  try {
    void securitySolutionEventBus.emitAlertStatusChanged(request, {
      alertIds: securityAlertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
      status: payload.status,
      previousStatuses: payload.previousStatuses
        .filter(({ id }) => securityIdSet.has(id))
        .slice(0, MAX_ALERTS_PER_TRIGGER),
      truncated: securityAlertIds.length > MAX_ALERTS_PER_TRIGGER,
    });
  } catch (err) {
    logger.warn(`Failed to forward Cases alertStatusChanged event to workflow triggers: ${err}`);
  }
};

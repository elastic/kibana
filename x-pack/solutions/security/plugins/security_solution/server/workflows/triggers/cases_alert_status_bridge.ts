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
import { isAttackDiscoveryIndex } from '../../lib/detection_engine/routes/common/operations/is_attack_discovery_index';

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
  index.startsWith(SIEM_SIGNALS_INDEX_PREFIX) ||
  // Adhoc AD index (.adhoc.alerts-security.attack.discovery.*) matches none of the
  // prefixes above, so we must check it explicitly.
  isAttackDiscoveryIndex(index);

export const forwardCasesAlertStatusToSecuritySolution = (
  securitySolutionEventBus: SecuritySolutionEventBus,
  logger: Logger,
  request: KibanaRequest,
  payload: CasesAlertStatusPayload
): void => {
  const attackIds: string[] = [];
  const alertIds: string[] = [];

  for (const id of payload.alertIds) {
    const index = payload.alertIdToIndex[id];
    if (index !== undefined && isSecurityIndex(index)) {
      if (isAttackDiscoveryIndex(index)) {
        attackIds.push(id);
      } else {
        alertIds.push(id);
      }
    }
  }

  if (attackIds.length === 0 && alertIds.length === 0) {
    return;
  }

  if (attackIds.length > 0) {
    const cappedAttackIds = attackIds.slice(0, MAX_ALERTS_PER_TRIGGER);
    const cappedAttackIdSet = new Set(cappedAttackIds);
    try {
      void securitySolutionEventBus.emitAttackStatusChanged(request, {
        attackIds: cappedAttackIds,
        status: payload.status,
        // Filter against the capped set so previousStatuses never references an ID
        // that was truncated out of attackIds (the two arrays are independent).
        previousStatuses: payload.previousStatuses.filter(({ id }) => cappedAttackIdSet.has(id)),
        truncated: attackIds.length > MAX_ALERTS_PER_TRIGGER,
      });
    } catch (err) {
      logger.warn(`Failed to forward Cases attackStatusChanged event to workflow triggers: ${err}`);
    }
  }

  if (alertIds.length > 0) {
    const cappedAlertIds = alertIds.slice(0, MAX_ALERTS_PER_TRIGGER);
    const cappedAlertIdSet = new Set(cappedAlertIds);
    try {
      void securitySolutionEventBus.emitAlertStatusChanged(request, {
        alertIds: cappedAlertIds,
        status: payload.status,
        previousStatuses: payload.previousStatuses.filter(({ id }) => cappedAlertIdSet.has(id)),
        truncated: alertIds.length > MAX_ALERTS_PER_TRIGGER,
      });
    } catch (err) {
      logger.warn(`Failed to forward Cases alertStatusChanged event to workflow triggers: ${err}`);
    }
  }
};

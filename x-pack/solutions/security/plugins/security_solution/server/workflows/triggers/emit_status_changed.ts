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
import type { PreviousStatus } from '../../events/types';

const capAndFilter = (
  ids: readonly string[],
  previousStatuses: readonly PreviousStatus[]
): { capped: string[]; filteredPrev: PreviousStatus[]; truncated: boolean } => {
  const capped = ids.slice(0, MAX_ALERTS_PER_TRIGGER) as string[];
  const cappedSet = new Set(capped);
  return {
    capped,
    filteredPrev: previousStatuses.filter(({ id }) => cappedSet.has(id)) as PreviousStatus[],
    truncated: ids.length > MAX_ALERTS_PER_TRIGGER,
  };
};

export const emitAttackStatusChangedWithCap = (
  eventBus: SecuritySolutionEventBus,
  request: KibanaRequest,
  status: WorkflowStatus,
  attackIds: readonly string[],
  previousStatuses: readonly PreviousStatus[],
  logger?: Logger
): void => {
  if (attackIds.length === 0) return;
  const { capped, filteredPrev, truncated } = capAndFilter(attackIds, previousStatuses);
  try {
    eventBus.emitAttackStatusChanged(request, {
      attackIds: capped,
      status,
      previousStatuses: filteredPrev,
      truncated,
    });
    logger?.debug(
      `[workflow-trigger] attackStatusChanged fired: count=${capped.length} truncated=${truncated}`
    );
  } catch (err) {
    logger?.warn(`Failed to emit attackStatusChanged workflow trigger: ${err}`);
  }
};

export const emitAlertStatusChangedWithCap = (
  eventBus: SecuritySolutionEventBus,
  request: KibanaRequest,
  status: WorkflowStatus,
  alertIds: readonly string[],
  previousStatuses: readonly PreviousStatus[],
  logger?: Logger
): void => {
  if (alertIds.length === 0) return;
  const { capped, filteredPrev, truncated } = capAndFilter(alertIds, previousStatuses);
  try {
    eventBus.emitAlertStatusChanged(request, {
      alertIds: capped,
      status,
      previousStatuses: filteredPrev,
      truncated,
    });
    logger?.debug(
      `[workflow-trigger] alertStatusChanged fired: count=${capped.length} truncated=${truncated}`
    );
  } catch (err) {
    logger?.warn(`Failed to emit alertStatusChanged workflow trigger: ${err}`);
  }
};

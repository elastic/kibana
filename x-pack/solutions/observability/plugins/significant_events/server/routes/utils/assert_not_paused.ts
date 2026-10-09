/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { stateBlocksNewActivity } from '../../../common/maintenance/state_machine';
import { SignificantEventsPausedError } from '../../lib/errors/significant_events_paused_error';
import type { SignificantEventsMaintenanceService } from '../../lib/maintenance/maintenance_service';

/**
 * Blocks routes that start new background activity when the deployment is
 * paused. Reads the persisted state and throws a 409 when `state === 'paused'`.
 * Never apply this to the resume route, or Pause could not be undone.
 */
export async function assertNotPaused({
  maintenanceService,
  request,
}: {
  maintenanceService: SignificantEventsMaintenanceService;
  request: KibanaRequest;
}): Promise<void> {
  // Only the persisted state is needed here (no feature-settings reads), so use
  // the lightweight getState rather than the UI-oriented getStatus.
  const state = await maintenanceService.getState({ request });
  if (stateBlocksNewActivity(state)) {
    throw new SignificantEventsPausedError();
  }
}

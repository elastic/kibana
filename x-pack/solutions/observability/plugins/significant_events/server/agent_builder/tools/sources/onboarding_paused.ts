/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { MaintenanceStateReader } from './source_tool_deps';

/** What the flag means, for the tool descriptions of the tools that return it. */
export const ONBOARDING_PAUSED_DESCRIPTION =
  '`onboarding_paused: true` means significant events activity is paused: the change is saved but the source is not onboarded until the user resumes activity in settings.';

/** `{ onboarding_paused: true }` when the space is paused, since writes still go through but onboarding waits. */
export const getOnboardingPausedFlag = async ({
  maintenanceService,
  request,
}: {
  maintenanceService: MaintenanceStateReader;
  request: KibanaRequest;
}): Promise<{ onboarding_paused?: true }> =>
  (await maintenanceService.getState({ request })) === 'paused' ? { onboarding_paused: true } : {};

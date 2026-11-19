/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CoreStart } from '@kbn/core/server';
import type { ObservabilityOnboardingRequestHandlerContext } from '../../types';
import type { SavedObservabilityOnboardingFlow } from '../../saved_objects/observability_onboarding_status';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '../../saved_objects/observability_onboarding_status';

export const ONBOARDING_SESSION_NOT_FOUND_MESSAGE =
  'Unable to report setup progress - onboarding session not found.';

export const createObservabilityOnboardingInternalRepository = (coreStart: CoreStart) =>
  coreStart.savedObjects.createInternalRepository([
    OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  ]);

export async function getCurrentUsername(
  context: ObservabilityOnboardingRequestHandlerContext
): Promise<string | undefined> {
  const coreContext = await context.core;
  return coreContext.security.authc.getCurrentUser()?.username;
}

export async function assertFlowOwnership({
  context,
  flow,
  notFoundMessage = ONBOARDING_SESSION_NOT_FOUND_MESSAGE,
}: {
  context: ObservabilityOnboardingRequestHandlerContext;
  flow: Pick<SavedObservabilityOnboardingFlow, 'createdBy'>;
  notFoundMessage?: string;
}): Promise<void> {
  const username = await getCurrentUsername(context);
  if (!username || flow.createdBy !== username) {
    throw Boom.notFound(notFoundMessage);
  }
}

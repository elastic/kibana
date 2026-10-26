/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type {
  GetOnboardingResponse,
  StartOnboardingSuggestionsResponse,
} from '../../common/onboarding';
import {
  OnboardingUnavailableError,
  OnboardingValidationError,
} from '../onboarding/onboarding_client';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const rethrowOnboardingError = (error: unknown): never => {
  if (error instanceof OnboardingValidationError) {
    throw badRequest(error.message);
  }
  if (error instanceof OnboardingUnavailableError) {
    throw serverUnavailable(error.message);
  }
  throw error;
};

const getOnboardingRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/onboarding',
  options: {
    access: 'internal',
    summary: 'Get onboarding state',
    description:
      "Returns the space's latest onboarding suggestions workflow execution and the first investigations it suggested.",
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: z.object({}),
  handler: async ({ request, onboardingClient }): Promise<GetOnboardingResponse> => {
    try {
      return await onboardingClient.get(request);
    } catch (error) {
      return rethrowOnboardingError(error);
    }
  },
});

const startOnboardingSuggestionsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/onboarding/suggestions',
  options: {
    access: 'internal',
    summary: 'Suggest first investigations',
    description:
      'Starts the onboarding suggestions workflow: the investigation agent explores the space from its sandbox and suggests first investigations. Requires at least one sandbox secret.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({}),
  handler: async ({ request, onboardingClient }): Promise<StartOnboardingSuggestionsResponse> => {
    try {
      return await onboardingClient.start(request);
    } catch (error) {
      return rethrowOnboardingError(error);
    }
  },
});

export const onboardingRoutes = {
  ...getOnboardingRoute,
  ...startOnboardingSuggestionsRoute,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import {
  MAX_ONBOARDING_CONNECTOR_ID_LENGTH,
  type GetOnboardingResponse,
  type StartOnboardingSuggestionsResponse,
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
      "Returns the space's latest onboarding suggestions workflow execution: the connected deployments and the suggested first investigations.",
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
      'Validates the External Elasticsearch connectors and starts the onboarding suggestions workflow for them.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({
    body: z.object({
      connector_ids: z
        .array(z.string().min(1).max(MAX_ONBOARDING_CONNECTOR_ID_LENGTH))
        .min(1)
        .max(5),
    }),
  }),
  handler: async ({
    request,
    params,
    onboardingClient,
  }): Promise<StartOnboardingSuggestionsResponse> => {
    try {
      return await onboardingClient.start(request, params.body.connector_ids);
    } catch (error) {
      return rethrowOnboardingError(error);
    }
  },
});

export const onboardingRoutes = {
  ...getOnboardingRoute,
  ...startOnboardingSuggestionsRoute,
};

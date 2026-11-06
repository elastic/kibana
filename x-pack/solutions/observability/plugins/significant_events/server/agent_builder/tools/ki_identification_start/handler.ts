/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import type {
  SignificantEventsKIsOnboardingClient,
  SignificantEventsKIsOnboardingInputs,
} from '../../../lib/workflows/onboarding_workflow_client';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import { assertNotPaused } from '../../../routes/utils/assert_not_paused';
import { NIGHTSHIFT_SOURCES_APP_PATH } from '../../../../common/constants';
import type { SignificantEventsServer } from '../../../types';

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface StartKiIdentificationHandlerParams {
  sourceId: string;
  sourceSlug: string;
  steps: KIsOnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
  /** Resolves a requested connector with the caller's own access. */
  server: Pick<SignificantEventsServer, 'inference' | 'core'>;
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  maintenanceService: SignificantEventsMaintenanceService;
  request: KibanaRequest;
}

interface StartKiIdentificationHandlerResult {
  kibanaPath: string;
}

export async function startKiIdentificationToolHandler({
  sourceId,
  sourceSlug,
  steps,
  connectors,
  server,
  streamsKIsOnboardingClient,
  maintenanceService,
  request,
}: StartKiIdentificationHandlerParams): Promise<StartKiIdentificationHandlerResult> {
  // Agent Builder bypasses the HTTP onboarding route; enforce the same pause
  // gate so Nightshift cannot start onboarding while activity is paused.
  await assertNotPaused({ maintenanceService, request });

  // The run executes as the detection engine service account, which may reach connectors the
  // caller cannot. The HTTP onboarding route resolves the requested connectors as the caller; do
  // the same here so a connector the caller cannot use is refused instead of used by the account.
  const resolveRequestedConnector = (
    step: 'kiExtraction' | 'kiQueryGeneration',
    requestedId: string | undefined
  ): Promise<string | undefined> =>
    requestedId === undefined
      ? Promise.resolve(undefined)
      : resolveNightshiftModelForRequest({
          request,
          inference: server.inference,
          savedObjects: server.core.savedObjects,
          uiSettings: server.core.uiSettings,
          step,
          requestedId,
        });
  const [featuresConnectorId, queriesConnectorId] = await Promise.all([
    resolveRequestedConnector('kiExtraction', connectors?.features),
    resolveRequestedConnector('kiQueryGeneration', connectors?.queries),
  ]);

  const now = Date.now();
  const skipFeatures = !steps.includes(KIsOnboardingStep.FeaturesIdentification);
  const skipQueries = !steps.includes(KIsOnboardingStep.QueriesGeneration);

  const inputs: SignificantEventsKIsOnboardingInputs = {
    sourceId,
    sourceSlug,
    features: {
      skip: skipFeatures,
      start: now - DEFAULT_LOOKBACK_MS,
      end: now,
      ...(featuresConnectorId && { connectorId: featuresConnectorId }),
    },
    queries: {
      skip: skipQueries,
      ...(queriesConnectorId && { connectorId: queriesConnectorId }),
    },
  };

  await streamsKIsOnboardingClient.run({ inputs, request });

  return {
    kibanaPath: NIGHTSHIFT_SOURCES_APP_PATH,
  };
}

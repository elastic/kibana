/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import type {
  SignificantEventsKIsOnboardingClient,
  SignificantEventsKIsOnboardingInputs,
} from '../../../lib/workflows/onboarding_workflow_client';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { GetScopedClients } from '../../../routes/types';
import { assertNotPaused } from '../../../routes/utils/assert_not_paused';
import { assertCanWriteKnowledgeIndicators } from '../../../lib/privileges';
import { SIGNIFICANT_EVENTS_APP_ROUTE } from '../../../../common/constants';

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface StartKiIdentificationHandlerParams {
  streamName: string;
  steps: KIsOnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  maintenanceService: SignificantEventsMaintenanceService;
  getScopedClients: GetScopedClients;
  request: KibanaRequest;
}

interface StartKiIdentificationHandlerResult {
  kibanaPath: string;
}

export async function startKiIdentificationToolHandler({
  streamName,
  steps,
  connectors,
  streamsKIsOnboardingClient,
  maintenanceService,
  getScopedClients,
  request,
}: StartKiIdentificationHandlerParams): Promise<StartKiIdentificationHandlerResult> {
  // Agent Builder bypasses the HTTP onboarding route; enforce the same preflight
  // gates so Nightshift cannot start onboarding without knowledge indicator write
  // access or while activity is paused.
  const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
  await assertCanWriteKnowledgeIndicators({
    esClient: scopedClusterClient.asCurrentUser,
    isSecurityEnabled,
  });
  await assertNotPaused({ maintenanceService, request });

  const now = Date.now();
  const skipFeatures = !steps.includes(KIsOnboardingStep.FeaturesIdentification);
  const skipQueries = !steps.includes(KIsOnboardingStep.QueriesGeneration);

  const inputs: SignificantEventsKIsOnboardingInputs = {
    streamName,
    features: {
      skip: skipFeatures,
      start: now - DEFAULT_LOOKBACK_MS,
      end: now,
      ...(connectors?.features && { connectorId: connectors.features }),
    },
    queries: {
      skip: skipQueries,
      ...(connectors?.queries && { connectorId: connectors.queries }),
    },
  };

  await streamsKIsOnboardingClient.run({ inputs, request });

  return {
    kibanaPath: `${SIGNIFICANT_EVENTS_APP_ROUTE}/knowledge_indicators?stream=${encodeURIComponent(
      streamName
    )}`,
  };
}

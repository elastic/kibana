/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import type {
  SignificantEventsKIsOnboardingClient,
  SignificantEventsKIsOnboardingInputs,
} from '../../../lib/workflows/onboarding_workflow_client';
import { startSourceOnboarding } from '../../../lib/workflows/start_source_onboarding';
import { StatusError } from '../../../lib/errors/status_error';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import { assertNotPaused } from '../../../routes/utils/assert_not_paused';
import { NIGHTSHIFT_SOURCES_APP_PATH } from '../../../../common/constants';

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface StartKiIdentificationHandlerParams {
  source: Pick<NightshiftSource, 'id' | 'slug' | 'view_name' | 'esql_updated_at'>;
  steps: KIsOnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  maintenanceService: SignificantEventsMaintenanceService;
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  logger: Logger;
}

interface StartKiIdentificationHandlerResult {
  kibanaPath: string;
}

export async function startKiIdentificationToolHandler({
  source,
  steps,
  connectors,
  streamsKIsOnboardingClient,
  maintenanceService,
  esClient,
  request,
  logger,
}: StartKiIdentificationHandlerParams): Promise<StartKiIdentificationHandlerResult> {
  // Agent Builder bypasses the HTTP onboarding route; enforce the same pause
  // gate so Nightshift cannot start onboarding while activity is paused.
  await assertNotPaused({ maintenanceService, request });

  const now = Date.now();
  const skipFeatures = !steps.includes(KIsOnboardingStep.FeaturesIdentification);
  const skipQueries = !steps.includes(KIsOnboardingStep.QueriesGeneration);

  const inputs: SignificantEventsKIsOnboardingInputs = {
    sourceId: source.id,
    sourceSlug: source.slug,
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

  const result = await startSourceOnboarding({
    source,
    inputs,
    onboardingClient: streamsKIsOnboardingClient,
    esClient,
    request,
    logger,
  });
  if (result.kind === 'refused') {
    // A 400 is reported as a refused call, not as a tool error.
    throw new StatusError(result.reason, 400);
  }

  return {
    kibanaPath: NIGHTSHIFT_SOURCES_APP_PATH,
  };
}

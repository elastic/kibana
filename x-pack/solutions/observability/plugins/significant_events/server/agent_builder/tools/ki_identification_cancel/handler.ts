/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import type { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';

interface CancelKiIdentificationHandlerParams {
  streamName: string;
  sourceSlug: string;
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  request: KibanaRequest;
}

interface CancelKiIdentificationHandlerResult {
  execution_id: string | null;
  status: SignificantEventsWorkflowStatus.Canceled;
}

export async function cancelKiIdentificationToolHandler({
  streamName,
  sourceSlug,
  streamsKIsOnboardingClient,
  request,
}: CancelKiIdentificationHandlerParams): Promise<CancelKiIdentificationHandlerResult> {
  const executionId = await streamsKIsOnboardingClient.cancel({
    streamName,
    sourceSlug,
    request,
  });

  return {
    execution_id: executionId,
    status: SignificantEventsWorkflowStatus.Canceled,
  };
}

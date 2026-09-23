/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';

interface GetKiIdentificationStatusHandlerParams {
  streamName: string;
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
}

export async function getKiIdentificationStatusToolHandler({
  streamName,
  streamsKIsOnboardingClient,
}: GetKiIdentificationStatusHandlerParams) {
  const { executionId, ...statusResult } = await streamsKIsOnboardingClient.getStatus({
    streamName,
  });

  return {
    stream_name: streamName,
    execution_id: executionId,
    ...statusResult,
  };
}

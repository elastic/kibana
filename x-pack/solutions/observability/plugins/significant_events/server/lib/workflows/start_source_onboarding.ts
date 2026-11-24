/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { assessSourceSampling } from '../significant_events/features/assess_source_sampling';
import type {
  SignificantEventsKIsOnboardingClient,
  SignificantEventsKIsOnboardingInputs,
} from './onboarding_workflow_client';

export type StartSourceOnboardingResult =
  | { kind: 'started'; executionId: string }
  | { kind: 'refused'; reason: string };

/**
 * Starts an onboarding run unless feature identification would have nothing to sample, as a
 * scheduled run takes its daily extraction unit before it reads the source.
 */
export const startSourceOnboarding = async ({
  source,
  inputs,
  onboardingClient,
  esClient,
  request,
  logger,
}: {
  source: Pick<NightshiftSource, 'view_name'>;
  inputs: SignificantEventsKIsOnboardingInputs;
  onboardingClient: Pick<SignificantEventsKIsOnboardingClient, 'run'>;
  /** Reads the data behind the source, as feature identification does. */
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  logger: Logger;
}): Promise<StartSourceOnboardingResult> => {
  if (!inputs.features.skip) {
    const { start, end } = inputs.features;
    const assessment = await assessSourceSampling({
      index: source.view_name,
      timeRange: { start, end },
      esClient,
      logger,
    });
    if (assessment.kind === 'unsupported') {
      return { kind: 'refused', reason: assessment.reason };
    }
    if (assessment.kind === 'empty') {
      return {
        kind: 'refused',
        reason: `The source holds no document between ${new Date(
          start
        ).toISOString()} and ${new Date(end).toISOString()}.`,
      };
    }
  }

  const { executionId } = await onboardingClient.run({ inputs, request });
  return { kind: 'started', executionId };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJourneyFailedSteps } from '../../../queries/get_journey_failed_steps';
import type { SyntheticsEsClient } from '../../../lib';

export interface StepInformation {
  stepName?: string;
  scriptSource?: string;
  stepNumber?: number;
}

/**
 * Fetches detailed step information from Elasticsearch for failed browser monitors
 */
export const getStepInformation = async (
  esClient: SyntheticsEsClient,
  checkGroup: string,
  monitorType: string
): Promise<StepInformation | null> => {
  // Only fetch for browser monitors
  if (monitorType !== 'browser') {
    return null;
  }

  try {
    const failedSteps = await getJourneyFailedSteps({
      syntheticsEsClient: esClient,
      checkGroups: [checkGroup],
    });

    if (failedSteps.length === 0) {
      return null;
    }

    // Get the first failed step
    const failedStep = failedSteps[0];
    const stepName = failedStep.synthetics?.step?.name;
    const scriptSource = failedStep.synthetics?.payload?.source;
    const stepNumber = failedStep.synthetics?.step?.index;

    return {
      stepName,
      scriptSource,
      stepNumber,
    };
  } catch (error) {
    // Silently fail if we can't fetch step information
    return null;
  }
};

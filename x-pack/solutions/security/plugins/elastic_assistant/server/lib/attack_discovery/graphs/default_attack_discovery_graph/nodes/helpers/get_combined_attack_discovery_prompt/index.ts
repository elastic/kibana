/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import { getAlertsContextPrompt } from '../../generate/helpers/get_alerts_context_prompt';

/**
 * Returns the the initial query, or the initial query combined with a
 * continuation prompt and partial results
 */
export const getCombinedAttackDiscoveryPrompt = ({
  anonymizedAlerts,
  attackDiscoveryPrompt,
  combinedMaybePartialResults,
  continuePrompt,
}: {
  anonymizedAlerts: string[];
  attackDiscoveryPrompt: string;
  /** combined results that may contain incomplete JSON */
  combinedMaybePartialResults: string;
  continuePrompt: string;
}): string => {
  const alertsContextPrompt = getAlertsContextPrompt({
    anonymizedAlerts,
    attackDiscoveryPrompt,
  });

  return isEmpty(combinedMaybePartialResults)
    ? alertsContextPrompt // no partial results yet
    : `${alertsContextPrompt}

${continuePrompt}

"""
${combinedMaybePartialResults}
"""

`;
};

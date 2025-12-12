/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

// NOTE: we ask the LLM to `provide insights`. We do NOT use the feature name, `AttackDiscovery`, in the prompt.
const getAlertsContextPrompt = ({
  anonymizedAlerts,
  attackDiscoveryPrompt,
}: {
  anonymizedAlerts: string[];
  attackDiscoveryPrompt: string;
}) => `${attackDiscoveryPrompt}

Use context from the following alerts to provide insights:

"""
${anonymizedAlerts.join('\n\n')}
"""
`;

/**
 * Returns the the initial query, or the initial query combined with a
 * continuation prompt and partial results
 */
export const getCombinedAttackDiscoveryPrompt = ({
  anonymizedDocs,
  prompt,
  combinedMaybePartialResults,
  continuePrompt,
}: {
  anonymizedDocs: string[];
  prompt: string;
  /** combined results that may contain incomplete JSON */
  combinedMaybePartialResults: string;
  continuePrompt: string;
}): string => {
  const alertsContextPrompt = getAlertsContextPrompt({
    anonymizedAlerts: anonymizedDocs,
    attackDiscoveryPrompt: prompt,
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

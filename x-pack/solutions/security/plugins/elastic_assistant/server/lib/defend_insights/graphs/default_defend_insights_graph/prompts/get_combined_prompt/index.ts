/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

// NOTE: we ask the LLM to `provide insights`. We do NOT use the feature name, `DefendInsights`, in the prompt.
const getEventsContextPrompt = ({
  anonymizedEvents,
  defendInsightsPrompt,
}: {
  anonymizedEvents: string[];
  defendInsightsPrompt: string;
}) => `${defendInsightsPrompt}

Use context from the following events to provide insights:

"""
${anonymizedEvents.join('\n\n')}
"""
`;

/**
 * Returns the the initial query, or the initial query combined with a
 * continuation prompt and partial results
 */
export const getCombinedDefendInsightsPrompt = ({
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
  const eventsContextPrompt = getEventsContextPrompt({
    anonymizedEvents: anonymizedDocs,
    defendInsightsPrompt: prompt,
  });

  return isEmpty(combinedMaybePartialResults)
    ? eventsContextPrompt // no partial results yet
    : `${eventsContextPrompt}

${continuePrompt}

"""
${combinedMaybePartialResults}
"""

`;
};

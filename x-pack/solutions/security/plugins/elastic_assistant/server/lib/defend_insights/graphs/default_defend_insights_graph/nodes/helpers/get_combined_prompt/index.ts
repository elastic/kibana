/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import { getEventsContextPrompt } from '../../generate/helpers/get_events_context_prompt';
import { getContinuePrompt } from '../get_continue_prompt';

/**
 * Returns the the initial query, or the initial query combined with a
 * continuation prompt and partial results
 */
export const getCombinedDefendInsightsPrompt = ({
  anonymizedEvents,
  prompt,
  combinedMaybePartialResults,
}: {
  anonymizedEvents: string[];
  prompt: string;
  /** combined results that may contain incomplete JSON */
  combinedMaybePartialResults: string;
}): string => {
  const eventsContextPrompt = getEventsContextPrompt({
    anonymizedEvents,
    prompt,
  });

  return isEmpty(combinedMaybePartialResults)
    ? eventsContextPrompt // no partial results yet
    : `${eventsContextPrompt}

${getContinuePrompt()}

"""
${combinedMaybePartialResults}
"""

`;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefendInsight } from '@kbn/elastic-assistant-common';
import { isEmpty } from 'lodash/fp';

import { getContinuePrompt } from '../../../helpers/get_continue_prompt';

/**
 * Returns a prompt that combines the initial query, a refine prompt, and partial results
 */
export const getCombinedRefinePrompt = ({
  prompt,
  combinedRefinements,
  refinePrompt,
  unrefinedResults,
}: {
  prompt: string;
  combinedRefinements: string;
  refinePrompt: string;
  unrefinedResults: DefendInsight[] | null;
}): string => {
  const baseQuery = `${prompt}

${refinePrompt}

"""
${JSON.stringify(unrefinedResults, null, 2)}
"""

`;

  return isEmpty(combinedRefinements)
    ? baseQuery // no partial results yet
    : `${baseQuery}

${getContinuePrompt()}

"""
${combinedRefinements}
"""

`;
};

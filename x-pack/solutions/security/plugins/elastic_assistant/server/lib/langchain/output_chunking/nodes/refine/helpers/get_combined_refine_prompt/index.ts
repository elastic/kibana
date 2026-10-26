/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import type { GraphInsightTypes } from '../../../../../graphs';

/**
 * Returns a prompt that combines the initial query, a refine prompt, and partial results
 */
export const getCombinedRefinePrompt = <T extends GraphInsightTypes>({
  prompt,
  combinedRefinements,
  continuePrompt,
  refinePrompt,
  unrefinedResults,
}: {
  prompt: string;
  combinedRefinements: string;
  continuePrompt: string;
  refinePrompt: string;
  unrefinedResults: T[] | null;
}): string => {
  const baseQuery = `${prompt}

${refinePrompt}

"""
\`\`\`json
{
  "insights": ${JSON.stringify(unrefinedResults, null, 2)}
}
\`\`\`
"""

`;

  return isEmpty(combinedRefinements)
    ? baseQuery // no partial results yet
    : `${baseQuery}

${continuePrompt}

"""
${combinedRefinements}
"""

`;
};

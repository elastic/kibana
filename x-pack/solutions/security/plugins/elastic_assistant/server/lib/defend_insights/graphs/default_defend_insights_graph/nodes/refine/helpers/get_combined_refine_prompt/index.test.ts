/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDefendInsights } from '../../../../mock/mock_defend_insights';
import { getContinuePrompt } from '../../../helpers/get_continue_prompt';
import { getCombinedRefinePrompt } from '.';

describe('getCombinedRefinePrompt', () => {
  const mockPrompt = 'Initial prompt text';
  const mockRefinePrompt = 'Please refine these results';

  it('returns base query when no combined refinements exist', () => {
    const result = getCombinedRefinePrompt({
      prompt: mockPrompt,
      combinedRefinements: '',
      refinePrompt: mockRefinePrompt,
      unrefinedResults: mockDefendInsights,
    });

    expect(result).toBe(`${mockPrompt}

${mockRefinePrompt}

"""
${JSON.stringify(mockDefendInsights, null, 2)}
"""

`);
  });

  it('includes combined refinements and continue prompt when refinements exist', () => {
    const mockRefinements = 'Previous refinement results';
    const result = getCombinedRefinePrompt({
      prompt: mockPrompt,
      combinedRefinements: mockRefinements,
      refinePrompt: mockRefinePrompt,
      unrefinedResults: mockDefendInsights,
    });

    const baseQuery = `${mockPrompt}

${mockRefinePrompt}

"""
${JSON.stringify(mockDefendInsights, null, 2)}
"""

`;

    expect(result).toBe(`${baseQuery}

${getContinuePrompt()}

"""
${mockRefinements}
"""

`);
  });

  it('handles null unrefined results', () => {
    const result = getCombinedRefinePrompt({
      prompt: mockPrompt,
      combinedRefinements: '',
      refinePrompt: mockRefinePrompt,
      unrefinedResults: null,
    });

    expect(result).toBe(`${mockPrompt}

${mockRefinePrompt}

"""
null
"""

`);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCombinedDefendInsightsPrompt } from '.';

describe('getCombinedDefendInsightsPrompt', () => {
  it('returns the initial query when there are no partial results', () => {
    const result = getCombinedDefendInsightsPrompt({
      anonymizedEvents: ['event1', 'event2'],
      prompt: 'defendInsightsPrompt',
      combinedMaybePartialResults: '',
    });

    expect(result).toBe(`defendInsightsPrompt

Use context from the following events to provide insights:

"""
event1

event2
"""
`);
  });

  it('returns the initial query combined with a continuation prompt and partial results', () => {
    const result = getCombinedDefendInsightsPrompt({
      anonymizedEvents: ['event1', 'event2'],
      prompt: 'defendInsightsPrompt',
      combinedMaybePartialResults: 'partialResults',
    });

    expect(result).toBe(`defendInsightsPrompt

Use context from the following events to provide insights:

"""
event1

event2
"""


Continue exactly where you left off in the JSON output below, generating only the additional JSON output when it's required to complete your work. The additional JSON output MUST ALWAYS follow these rules:
1) it MUST conform to the schema above, because it will be checked against the JSON schema
2) it MUST escape all JSON special characters (i.e. backslashes, double quotes, newlines, tabs, carriage returns, backspaces, and form feeds), because it will be parsed as JSON
3) it MUST NOT repeat any the previous output, because that would prevent partial results from being combined
4) it MUST NOT restart from the beginning, because that would prevent partial results from being combined
5) it MUST NOT be prefixed or suffixed with additional text outside of the JSON, because that would prevent it from being combined and parsed as JSON:


"""
partialResults
"""

`);
  });
});

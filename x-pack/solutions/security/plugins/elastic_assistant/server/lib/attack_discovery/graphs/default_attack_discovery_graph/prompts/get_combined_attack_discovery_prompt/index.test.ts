/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCombinedAttackDiscoveryPrompt } from '.';
import { ATTACK_DISCOVERY_CONTINUE } from '../../../../../prompt/prompts';

describe('getCombinedAttackDiscoveryPrompt', () => {
  it('returns the initial query when there are no partial results', () => {
    const result = getCombinedAttackDiscoveryPrompt({
      anonymizedDocs: ['alert1', 'alert2'],
      prompt: 'attackDiscoveryPrompt',
      continuePrompt: ATTACK_DISCOVERY_CONTINUE,
      combinedMaybePartialResults: '',
    });

    expect(result).toBe(`attackDiscoveryPrompt

Use context from the following alerts to provide insights:

"""
alert1

alert2
"""
`);
  });

  it('returns the initial query combined with a continuation prompt and partial results', () => {
    const result = getCombinedAttackDiscoveryPrompt({
      anonymizedDocs: ['alert1', 'alert2'],
      prompt: 'attackDiscoveryPrompt',
      continuePrompt: ATTACK_DISCOVERY_CONTINUE,
      combinedMaybePartialResults: 'partialResults',
    });

    expect(result).toBe(`attackDiscoveryPrompt

Use context from the following alerts to provide insights:

"""
alert1

alert2
"""



Continue your JSON analysis from exactly where you left off. Generate only the additional content needed to complete the response.

FORMAT REQUIREMENTS:
1. Maintain strict JSON validity:
   - Use double quotes for all strings
   - Properly escape special characters (\" for quotes, \\ for backslashes, \n for newlines)
   - Avoid all control characters (ASCII 0-31)
   - Keep text fields under 500 characters

2. Output rules:
   - Do not repeat any previously generated content
   - Do not include explanatory text outside the JSON
   - Do not restart from the beginning
   - Conform exactly to the JSON schema defined earlier

Your continuation should seamlessly connect with the previous output to form a complete, valid JSON document.


"""
partialResults
"""

`);
  });
});

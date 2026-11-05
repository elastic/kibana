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

  it('returns the initial query combined with a continuation prompt and partial results, without re-sending the alerts', () => {
    const result = getCombinedAttackDiscoveryPrompt({
      anonymizedDocs: ['alert1', 'alert2'],
      prompt: 'attackDiscoveryPrompt',
      continuePrompt: ATTACK_DISCOVERY_CONTINUE,
      combinedMaybePartialResults: 'partialResults',
    });

    expect(result).toBe(`attackDiscoveryPrompt

${ATTACK_DISCOVERY_CONTINUE}

"""
partialResults
"""

`);
    // the alert context is intentionally omitted on continuation calls: re-sending it
    // with a partial attack narrative trips the input-side content filter on some
    // models (e.g. claude-5.5-opus); see the generate node for details
    expect(result).not.toContain('alert1');
    expect(result).not.toContain('Use context from the following alerts');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecommendedAction } from '@kbn/pnd-common';

import { getHitlTone, PND_HITL_TONES } from '.';

describe('getHitlTone', () => {
  describe('a reversible gate takes the tone of its recommended action', () => {
    const expected: Array<[RecommendedAction, string]> = [
      ['contain', 'danger'],
      ['escalate', 'warning'],
      ['investigate', 'primary'],
      ['tune', 'primary'],
    ];

    it.each(expected)('returns %s -> %s', (recommendedAction, tone) => {
      expect(getHitlTone({ recommendedAction, reversible: true })).toEqual(tone);
    });
  });

  describe('an irreversible gate is danger whatever it recommends', () => {
    const actions: RecommendedAction[] = ['contain', 'escalate', 'investigate', 'tune'];

    it.each(actions)('returns danger for an irreversible %s gate', (recommendedAction) => {
      expect(getHitlTone({ recommendedAction, reversible: false })).toEqual('danger');
    });
  });

  it('returns a tone that is one of the three the card draws', () => {
    expect(PND_HITL_TONES).toEqual(['danger', 'primary', 'warning']);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIlmPhaseDescription } from './get_ilm_phase_description';
import {
  COLD_DESCRIPTION,
  FROZEN_DESCRIPTION,
  HOT_DESCRIPTION,
  UNMANAGED_DESCRIPTION,
  WARM_DESCRIPTION,
} from '../translations';

describe('helpers', () => {
  describe('getIlmPhaseDescription', () => {
    const phases: Array<{
      phase: string;
      expected: string;
    }> = [
      {
        phase: 'hot',
        expected: HOT_DESCRIPTION,
      },
      {
        phase: 'warm',
        expected: WARM_DESCRIPTION,
      },
      {
        phase: 'cold',
        expected: COLD_DESCRIPTION,
      },
      {
        phase: 'frozen',
        expected: FROZEN_DESCRIPTION,
      },
      {
        phase: 'unmanaged',
        expected: UNMANAGED_DESCRIPTION,
      },
      {
        phase: 'something-else',
        expected: ' ',
      },
    ];

    phases.forEach(({ phase, expected }) => {
      test(`it returns ${expected} when phase is ${phase}`, () => {
        expect(getIlmPhaseDescription(phase)).toBe(expected);
      });
    });
  });
});

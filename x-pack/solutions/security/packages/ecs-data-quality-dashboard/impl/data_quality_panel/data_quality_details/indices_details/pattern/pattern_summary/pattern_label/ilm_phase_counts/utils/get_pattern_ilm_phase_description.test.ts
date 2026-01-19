/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPatternIlmPhaseDescription } from './get_pattern_ilm_phase_description';

describe('getPatternIlmPhaseDescription', () => {
  const phases: Array<{
    expected: string;
    indices: number;
    pattern: string;
    phase: string;
  }> = [
    {
      expected:
        '1 index matching the .alerts-security.alerts-default pattern is hot. Hot indices are actively being updated and queried.',
      indices: 1,
      pattern: '.alerts-security.alerts-default',
      phase: 'hot',
    },
    {
      expected:
        '2 indices matching the .alerts-security.alerts-default pattern are hot. Hot indices are actively being updated and queried.',
      indices: 2,
      pattern: '.alerts-security.alerts-default',
      phase: 'hot',
    },
    {
      expected:
        '1 index matching the .alerts-security.alerts-default pattern is warm. Warm indices are no longer being updated but are still being queried.',
      indices: 1,
      pattern: '.alerts-security.alerts-default',
      phase: 'warm',
    },
    {
      expected:
        '2 indices matching the .alerts-security.alerts-default pattern are warm. Warm indices are no longer being updated but are still being queried.',
      indices: 2,
      pattern: '.alerts-security.alerts-default',
      phase: 'warm',
    },
    {
      expected:
        '1 index matching the .alerts-security.alerts-default pattern is cold. Cold indices are no longer being updated and are queried infrequently. The information still needs to be searchable, but it’s okay if those queries are slower.',
      indices: 1,
      pattern: '.alerts-security.alerts-default',
      phase: 'cold',
    },
    {
      expected:
        '2 indices matching the .alerts-security.alerts-default pattern are cold. Cold indices are no longer being updated and are queried infrequently. The information still needs to be searchable, but it’s okay if those queries are slower.',
      indices: 2,
      pattern: '.alerts-security.alerts-default',
      phase: 'cold',
    },
    {
      expected:
        "1 index matching the .alerts-security.alerts-default pattern is frozen. Frozen indices are no longer being updated and are queried rarely. The information still needs to be searchable, but it's okay if those queries are extremely slow.",
      indices: 1,
      pattern: '.alerts-security.alerts-default',
      phase: 'frozen',
    },
    {
      expected:
        "2 indices matching the .alerts-security.alerts-default pattern are frozen. Frozen indices are no longer being updated and are queried rarely. The information still needs to be searchable, but it's okay if those queries are extremely slow.",
      indices: 2,
      pattern: '.alerts-security.alerts-default',
      phase: 'frozen',
    },
    {
      expected:
        '1 index matching the .alerts-security.alerts-default pattern is unmanaged by Index Lifecycle Management (ILM)',
      indices: 1,
      pattern: '.alerts-security.alerts-default',
      phase: 'unmanaged',
    },
    {
      expected:
        '2 indices matching the .alerts-security.alerts-default pattern are unmanaged by Index Lifecycle Management (ILM)',
      indices: 2,
      pattern: '.alerts-security.alerts-default',
      phase: 'unmanaged',
    },
    {
      expected: '',
      indices: 1,
      pattern: '.alerts-security.alerts-default',
      phase: 'some-other-phase',
    },
    {
      expected: '',
      indices: 2,
      pattern: '.alerts-security.alerts-default',
      phase: 'some-other-phase',
    },
  ];

  phases.forEach(({ expected, indices, pattern, phase }) => {
    test(`it returns the expected description when indices is ${indices}, pattern is ${pattern}, and phase is ${phase}`, () => {
      expect(getPatternIlmPhaseDescription({ indices, pattern, phase })).toBe(expected);
    });
  });
});

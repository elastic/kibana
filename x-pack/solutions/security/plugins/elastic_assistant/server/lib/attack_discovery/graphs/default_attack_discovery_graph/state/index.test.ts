/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultGraphState } from '.';
import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';
import {
  ATTACK_DISCOVERY_CONTINUE,
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
} from '../../../../prompt/prompts';

const defaultAttackDiscoveryPrompt = ATTACK_DISCOVERY_DEFAULT;
const defaultRefinePrompt = ATTACK_DISCOVERY_REFINE;
const prompts = {
  continue: ATTACK_DISCOVERY_CONTINUE,
  default: defaultAttackDiscoveryPrompt,
  refine: defaultRefinePrompt,
};
describe('getDefaultGraphState', () => {
  it('returns the expected default attackDiscoveries', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.attackDiscoveries?.default?.()).toBeNull();
  });

  it('returns the expected default attackDiscoveryPrompt', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.attackDiscoveryPrompt?.default?.()).toEqual(defaultAttackDiscoveryPrompt);
  });

  it('returns the expected default empty collection of anonymizedAlerts', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.anonymizedAlerts?.default?.()).toHaveLength(0);
  });

  it('returns the expected default combinedGenerations state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.combinedGenerations?.default?.()).toBe('');
  });

  it('returns the expected default combinedRefinements state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.combinedRefinements?.default?.()).toBe('');
  });

  it('returns the expected default errors state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.errors?.default?.()).toHaveLength(0);
  });

  it('return the expected default generationAttempts state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.generationAttempts?.default?.()).toBe(0);
  });

  it('returns the expected default generations state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.generations?.default?.()).toHaveLength(0);
  });

  it('returns the expected default hallucinationFailures state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.hallucinationFailures?.default?.()).toBe(0);
  });

  it('returns the expected default refinePrompt state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.refinePrompt?.default?.()).toEqual(defaultRefinePrompt);
  });

  it('returns the expected default maxGenerationAttempts state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.maxGenerationAttempts?.default?.()).toBe(DEFAULT_MAX_GENERATION_ATTEMPTS);
  });

  it('returns the expected default maxHallucinationFailures state', () => {
    const state = getDefaultGraphState({ prompts });
    expect(state.maxHallucinationFailures?.default?.()).toBe(DEFAULT_MAX_HALLUCINATION_FAILURES);
  });

  it('returns the expected default maxRepeatedGenerations state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.maxRepeatedGenerations?.default?.()).toBe(DEFAULT_MAX_REPEATED_GENERATIONS);
  });

  it('returns the expected default refinements state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.refinements?.default?.()).toHaveLength(0);
  });

  it('returns the expected default replacements state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.replacements?.default?.()).toEqual({});
  });

  it('returns the expected default unrefinedResults state', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.unrefinedResults?.default?.()).toBeNull();
  });

  it('returns the expected default end', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.end?.default?.()).toBeUndefined();
  });

  it('returns the expected end when it is provided', () => {
    const end = '2025-01-02T00:00:00.000Z';

    const state = getDefaultGraphState({ prompts, end });

    expect(state.end?.default?.()).toEqual(end);
  });

  it('returns the expected default filter to be undefined', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.filter?.default?.()).toBeUndefined();
  });

  it('returns the expected filter when it is provided', () => {
    const filter = {
      bool: {
        must: [],
        filter: [
          {
            match_phrase: {
              'user.name': 'root',
            },
          },
        ],
        should: [],
        must_not: [
          {
            match_phrase: {
              'host.name': 'foo',
            },
          },
        ],
      },
    };

    const state = getDefaultGraphState({ prompts, filter });

    expect(state.filter?.default?.()).toEqual(filter);
  });

  it('returns the expected default start to be undefined', () => {
    const state = getDefaultGraphState({ prompts });

    expect(state.start?.default?.()).toBeUndefined();
  });

  it('returns the expected start when it is provided', () => {
    const start = '2025-01-01T00:00:00.000Z';

    const state = getDefaultGraphState({ prompts, start });

    expect(state.start?.default?.()).toEqual(start);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { getDefaultRefinePrompt } from '../nodes/refine/helpers/get_default_refine_prompt';
import { getDefendInsightsPrompt } from '../nodes/helpers/prompts';
import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';
import { getDefaultGraphState } from '.';

const defaultInsightType = DefendInsightType.Enum.incompatible_antivirus;
const defaultDefendInsightsPrompt = getDefendInsightsPrompt({
  type: defaultInsightType,
});
const defaultRefinePrompt = getDefaultRefinePrompt();

describe('getDefaultGraphState', () => {
  it('returns the expected default defend insights', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.insights?.default?.()).toBeNull();
  });

  it('returns the expected default prompt', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.prompt?.default?.()).toEqual(defaultDefendInsightsPrompt);
  });

  it('returns the expected default empty collection of anonymizedEvents', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.anonymizedEvents?.default?.()).toHaveLength(0);
  });

  it('returns the expected default combinedGenerations state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.combinedGenerations?.default?.()).toBe('');
  });

  it('returns the expected default combinedRefinements state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.combinedRefinements?.default?.()).toBe('');
  });

  it('returns the expected default errors state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.errors?.default?.()).toHaveLength(0);
  });

  it('return the expected default generationAttempts state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.generationAttempts?.default?.()).toBe(0);
  });

  it('returns the expected default generations state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.generations?.default?.()).toHaveLength(0);
  });

  it('returns the expected default hallucinationFailures state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.hallucinationFailures?.default?.()).toBe(0);
  });

  it('returns the expected default refinePrompt state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.refinePrompt?.default?.()).toEqual(defaultRefinePrompt);
  });

  it('returns the expected default maxGenerationAttempts state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.maxGenerationAttempts?.default?.()).toBe(DEFAULT_MAX_GENERATION_ATTEMPTS);
  });

  it('returns the expected default maxHallucinationFailures state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });
    expect(state.maxHallucinationFailures?.default?.()).toBe(DEFAULT_MAX_HALLUCINATION_FAILURES);
  });

  it('returns the expected default maxRepeatedGenerations state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.maxRepeatedGenerations?.default?.()).toBe(DEFAULT_MAX_REPEATED_GENERATIONS);
  });

  it('returns the expected default refinements state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.refinements?.default?.()).toHaveLength(0);
  });

  it('returns the expected default replacements state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.replacements?.default?.()).toEqual({});
  });

  it('returns the expected default unrefinedResults state', () => {
    const state = getDefaultGraphState({ insightType: defaultInsightType });

    expect(state.unrefinedResults?.default?.()).toBeNull();
  });
});

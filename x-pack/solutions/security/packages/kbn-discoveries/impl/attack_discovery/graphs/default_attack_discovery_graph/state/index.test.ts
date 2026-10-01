/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseChannel } from '@langchain/langgraph';
import { getDefaultGraphAnnotation } from '.';
import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';
import {
  ATTACK_DISCOVERY_CONTINUE,
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
} from '../../../../__mocks__/mock_prompts';

// BinaryOperatorAggregate channels expose `.value` at runtime but the
// BaseChannel type definition doesn't surface it. Cast through unknown
// to access the default value in tests.
const channelDefault = (channel: BaseChannel): unknown =>
  (channel as unknown as { value: unknown }).value;

const defaultAttackDiscoveryPrompt = ATTACK_DISCOVERY_DEFAULT;
const defaultRefinePrompt = ATTACK_DISCOVERY_REFINE;
const prompts = {
  continue: ATTACK_DISCOVERY_CONTINUE,
  default: defaultAttackDiscoveryPrompt,
  refine: defaultRefinePrompt,
};
describe('getDefaultGraphState', () => {
  it('returns the expected default attackDiscoveries', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.insights)).toBeNull();
  });

  it('returns the expected default attackDiscoveryPrompt', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.prompt)).toEqual(defaultAttackDiscoveryPrompt);
  });

  it('returns the expected default empty collection of anonymizedAlerts', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.anonymizedDocuments)).toHaveLength(0);
  });

  it('returns the expected default combinedGenerations state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.combinedGenerations)).toBe('');
  });

  it('returns the expected default combinedRefinements state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.combinedRefinements)).toBe('');
  });

  it('returns the expected default errors state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.errors)).toHaveLength(0);
  });

  it('return the expected default generationAttempts state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.generationAttempts)).toBe(0);
  });

  it('returns the expected default generations state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.generations)).toHaveLength(0);
  });

  it('returns the expected default hallucinationFailures state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.hallucinationFailures)).toBe(0);
  });

  it('returns the expected default refinePrompt state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.refinePrompt)).toEqual(defaultRefinePrompt);
  });

  it('returns the expected default maxGenerationAttempts state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.maxGenerationAttempts)).toBe(
      DEFAULT_MAX_GENERATION_ATTEMPTS
    );
  });

  it('returns the expected default maxHallucinationFailures state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });
    expect(channelDefault(graphAnnotation.spec.maxHallucinationFailures)).toBe(
      DEFAULT_MAX_HALLUCINATION_FAILURES
    );
  });

  it('returns the expected default maxRepeatedGenerations state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.maxRepeatedGenerations)).toBe(
      DEFAULT_MAX_REPEATED_GENERATIONS
    );
  });

  it('returns the expected default refinements state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.refinements)).toHaveLength(0);
  });

  it('returns the expected default replacements state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.replacements)).toEqual({});
  });

  it('returns the expected default unrefinedResults state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.unrefinedResults)).toBeNull();
  });

  it('returns the expected default continuePrompt state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.continuePrompt)).toBe(prompts.continue);
  });

  it('returns the expected default end', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.end)).toBeUndefined();
  });

  it('returns the expected end when it is provided', () => {
    const end = '2025-01-02T00:00:00.000Z';

    const graphAnnotation = getDefaultGraphAnnotation({ prompts, end });

    expect(channelDefault(graphAnnotation.spec.end)).toEqual(end);
  });

  it('returns the expected default filter to be undefined', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.filter)).toBeUndefined();
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

    const graphAnnotation = getDefaultGraphAnnotation({ prompts, filter });

    expect(channelDefault(graphAnnotation.spec.filter)).toEqual(filter);
  });

  it('returns the expected default start to be undefined', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(channelDefault(graphAnnotation.spec.start)).toBeUndefined();
  });

  it('returns the expected start when it is provided', () => {
    const start = '2025-01-01T00:00:00.000Z';

    const graphAnnotation = getDefaultGraphAnnotation({ prompts, start });

    expect(channelDefault(graphAnnotation.spec.start)).toEqual(start);
  });
});

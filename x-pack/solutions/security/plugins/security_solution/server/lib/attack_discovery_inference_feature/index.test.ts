/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_FRONTIER_RECOMMENDED_ENDPOINTS } from '@kbn/alertzero-common';

import { getAttackDiscoveryInferenceFeature } from '.';

describe('getAttackDiscoveryInferenceFeature', () => {
  const feature = getAttackDiscoveryInferenceFeature({
    parentFeatureId: 'security_search_inference_parent',
  });

  it('keeps the attack_discovery feature id', () => {
    expect(feature.featureId).toBe('attack_discovery');
  });

  it('registers under the given parent feature', () => {
    expect(feature.parentFeatureId).toBe('security_search_inference_parent');
  });

  it('is a chat completion feature', () => {
    expect(feature.taskType).toBe('chat_completion');
  });

  it('recommends the same models as the AlertZero frontier tier', () => {
    expect(feature.recommendedEndpoints).toEqual([...ALERTZERO_FRONTIER_RECOMMENDED_ENDPOINTS]);
  });

  // Pinned literals, so a change to the shared AlertZero list also has to update this
  // Attack Discovery test (and get Attack Discovery owners' review).
  it('recommends GPT-6 Sol, GPT-5.6 Sol, and Claude Opus 5, in that order', () => {
    expect(feature.recommendedEndpoints).toEqual([
      '.openai-gpt-6-sol-chat_completion',
      '.openai-gpt-5.6-sol-chat_completion',
      '.anthropic-claude-5-opus-chat_completion',
    ]);
  });

  it('does not recommend the platform default model', () => {
    expect(feature.recommendedEndpoints).not.toContain(
      '.anthropic-claude-4.6-sonnet-chat_completion'
    );
  });

  it('lets the curated models win over the global default model', () => {
    expect(feature.ignoreGlobalDefault).toBe(true);
  });

  it('does not list template-required models', () => {
    expect(feature.allowTemplateRequiredModels).toBeUndefined();
  });

  it('is visible on the Model Settings page', () => {
    expect(feature.isHidden).toBeUndefined();
  });
});

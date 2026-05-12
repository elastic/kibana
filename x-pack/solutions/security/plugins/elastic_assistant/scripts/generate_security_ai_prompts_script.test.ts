/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Prompt } from '@kbn/security-ai-prompts';
import {
  SAVED_OBJECT_ID_PREFIX,
  generateSavedObject,
  generateSavedObjects,
  generateStableId,
} from './generate_security_ai_prompts_script';

const basePrompt: Prompt = {
  promptGroupId: 'aiAssistant',
  promptId: 'systemPrompt',
  prompt: { default: 'You are a helpful assistant.' },
};

describe('generateStableId', () => {
  it('converts camelCase to kebab-case', () => {
    const id = generateStableId(basePrompt);
    expect(id).toBe(`${SAVED_OBJECT_ID_PREFIX}ai-assistant-system-prompt`);
  });

  it('handles acronyms correctly (e.g. ESQL stays grouped)', () => {
    const id = generateStableId({ ...basePrompt, promptId: 'NaturalLanguageESQLTool' });
    expect(id).toBe(`${SAVED_OBJECT_ID_PREFIX}ai-assistant-natural-language-esql-tool`);
  });

  it('appends provider when present', () => {
    const id = generateStableId({ ...basePrompt, provider: 'openai' });
    expect(id).toBe(`${SAVED_OBJECT_ID_PREFIX}ai-assistant-system-prompt-openai`);
  });

  it('appends model when present', () => {
    const id = generateStableId({ ...basePrompt, provider: 'openai', model: 'gpt-4o' });
    expect(id).toBe(`${SAVED_OBJECT_ID_PREFIX}ai-assistant-system-prompt-openai-gpt-4o`);
  });

  it('omits model segment when provider is absent', () => {
    const id = generateStableId({ ...basePrompt, model: 'gpt-4o' });
    expect(id).toBe(`${SAVED_OBJECT_ID_PREFIX}ai-assistant-system-prompt`);
  });

  it('does not collide when provider-only vs model-only have the same value', () => {
    const providerOnly = generateStableId({ ...basePrompt, provider: 'openai' });
    const modelOnly = generateStableId({ ...basePrompt, model: 'openai' });
    expect(providerOnly).not.toBe(modelOnly);
  });

  it('is fully lowercase', () => {
    const id = generateStableId({
      ...basePrompt,
      promptGroupId: 'AttackDiscovery',
      promptId: 'SystemPrompt',
      provider: 'OpenAI',
    });
    expect(id).toBe(id.toLowerCase());
  });

  it('returns the same id on repeated calls (stable)', () => {
    expect(generateStableId(basePrompt)).toBe(generateStableId(basePrompt));
  });

  it('produces distinct ids for different providers', () => {
    const openai = generateStableId({ ...basePrompt, provider: 'openai' });
    const bedrock = generateStableId({ ...basePrompt, provider: 'bedrock' });
    expect(openai).not.toBe(bedrock);
  });

  it('produces distinct ids for different promptGroupIds', () => {
    const a = generateStableId({ ...basePrompt, promptGroupId: 'aiAssistant' });
    const b = generateStableId({ ...basePrompt, promptGroupId: 'attackDiscovery' });
    expect(a).not.toBe(b);
  });

  it('produces distinct ids for different promptIds', () => {
    const a = generateStableId({ ...basePrompt, promptId: 'systemPrompt' });
    const b = generateStableId({ ...basePrompt, promptId: 'userPrompt' });
    expect(a).not.toBe(b);
  });
});

describe('generateSavedObject', () => {
  it('sets a stable id', () => {
    const result = generateSavedObject(basePrompt);
    expect(result.id).toBe(generateStableId(basePrompt));
  });

  it('sets type to security-ai-prompt', () => {
    expect(generateSavedObject(basePrompt).type).toBe('security-ai-prompt');
  });

  it('preserves prompt attributes', () => {
    const prompt: Prompt = { ...basePrompt, provider: 'bedrock', description: 'My prompt' };
    const { attributes } = generateSavedObject(prompt);
    expect(attributes.promptId).toBe(prompt.promptId);
    expect(attributes.promptGroupId).toBe(prompt.promptGroupId);
    expect(attributes.provider).toBe('bedrock');
    expect(attributes.description).toBe('My prompt');
    expect(attributes.prompt.default).toBe(prompt.prompt.default);
  });
});

describe('generateSavedObjects', () => {
  it('maps each prompt to a saved object with a unique stable id', () => {
    const prompts: Prompt[] = [
      { ...basePrompt, promptId: 'systemPrompt' },
      { ...basePrompt, promptId: 'userPrompt' },
      { ...basePrompt, promptId: 'systemPrompt', provider: 'openai' },
    ];
    const results = generateSavedObjects(prompts);
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

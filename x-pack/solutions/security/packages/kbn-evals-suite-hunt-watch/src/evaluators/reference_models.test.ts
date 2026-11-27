/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector } from '@kbn/evals';
import {
  DEFAULT_REFERENCE_MODELS,
  gatesCapabilityRows,
  resolveReferenceModels,
  toModelKey,
} from './reference_models';

const endpoint = (inferenceId: string, id = inferenceId): EvalConnector =>
  ({
    type: 'inference_endpoint',
    id,
    name: id,
    inferenceId,
    provider: 'elastic',
    taskType: 'chat_completion',
  } as EvalConnector);

describe('toModelKey', () => {
  it.each([
    ['eis-openai-gpt-6-sol', 'openai-gpt-6-sol'],
    ['eis-openai-gpt-6-sol-retry1', 'openai-gpt-6-sol'],
    ['.openai-gpt-6-sol-chat_completion', 'openai-gpt-6-sol'],
    ['anthropic-claude-5.5-opus', 'anthropic-claude-5-5-opus'],
    ['.anthropic-claude-5.5-opus-chat_completion', 'anthropic-claude-5-5-opus'],
    ['eis-anthropic-claude-5-5-opus', 'anthropic-claude-5-5-opus'],
  ])('maps %s to %s', (id, key) => {
    expect(toModelKey(id)).toBe(key);
  });
});

describe('resolveReferenceModels', () => {
  it('uses the default list when the env is unset or blank', () => {
    expect(resolveReferenceModels(undefined)).toBe(DEFAULT_REFERENCE_MODELS);
    expect(resolveReferenceModels('  ')).toBe(DEFAULT_REFERENCE_MODELS);
  });

  it('accepts `all`', () => {
    expect(resolveReferenceModels(' ALL ')).toBe('all');
  });

  it('splits a comma list and drops empty entries', () => {
    expect(resolveReferenceModels('openai-gpt-5.6-terra,,google-gemini-3.1-pro')).toEqual([
      'openai-gpt-5.6-terra',
      'google-gemini-3.1-pro',
    ]);
  });
});

describe('gatesCapabilityRows', () => {
  it.each(['.anthropic-claude-5.5-opus-chat_completion', '.openai-gpt-6-sol-chat_completion'])(
    'gates the default reference model %s',
    (inferenceId) => {
      expect(gatesCapabilityRows(endpoint(inferenceId), DEFAULT_REFERENCE_MODELS)).toBe(true);
    }
  );

  it('does not gate a model outside the reference list', () => {
    expect(
      gatesCapabilityRows(
        endpoint('.openai-gpt-5.6-terra-chat_completion'),
        DEFAULT_REFERENCE_MODELS
      )
    ).toBe(false);
  });

  it('matches a retried connector id', () => {
    expect(
      gatesCapabilityRows(
        endpoint('.openai-gpt-6-sol-chat_completion', 'eis-openai-gpt-6-sol-retry2'),
        DEFAULT_REFERENCE_MODELS
      )
    ).toBe(true);
  });

  it('gates every model when the reference is `all`', () => {
    expect(gatesCapabilityRows(endpoint('.openai-gpt-5.6-terra-chat_completion'), 'all')).toBe(
      true
    );
  });

  it('fails closed when the connector has no usable id', () => {
    expect(gatesCapabilityRows(endpoint('', ''), DEFAULT_REFERENCE_MODELS)).toBe(true);
  });

  it('honours a custom list', () => {
    expect(
      gatesCapabilityRows(endpoint('.openai-gpt-5.6-terra-chat_completion'), [
        'openai-gpt-5.6-terra',
      ])
    ).toBe(true);
  });
});

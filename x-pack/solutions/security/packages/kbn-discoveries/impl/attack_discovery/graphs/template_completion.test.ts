/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import {
  attackDiscoveryRefineTemplateRequest,
  createAttackDiscoveryTemplateCompletion,
} from './template_completion';

const chatComplete = jest.fn().mockResolvedValue({ content: '{}' });

const inferenceClient = { chatComplete } as unknown as InferenceClient;

describe('createAttackDiscoveryTemplateCompletion', () => {
  beforeEach(() => {
    chatComplete.mockClear();
  });

  it('clamps alerts and the partial JSON to the gateway schema', async () => {
    const complete = createAttackDiscoveryTemplateCompletion({
      inferenceClient,
      connectorId: 'daybreak',
    });

    await complete({
      alerts: Array.from({ length: 101 }, (_, index) => `${index}${'x'.repeat(8000)}`),
      phase: 'generate',
      partial: 'p'.repeat(100_001),
    });

    const variables = chatComplete.mock.calls[0][0].template.variables;
    expect(variables.alerts).toHaveLength(100);
    expect(variables.alerts[0]).toHaveLength(8000);
    expect(variables.partial).toHaveLength(100_000);
    expect(chatComplete.mock.calls[0][0].messages).toEqual([
      { role: MessageRole.User, content: '' },
    ]);
  });

  it('forwards the connector timeout', async () => {
    const complete = createAttackDiscoveryTemplateCompletion({
      inferenceClient,
      connectorId: 'daybreak',
      timeout: 600_000,
    });

    await complete({ alerts: ['alert'], phase: 'generate' });

    expect(chatComplete.mock.calls[0][0].timeout).toBe(600_000);
  });
});

describe('attackDiscoveryRefineTemplateRequest', () => {
  const alerts = ['alert-1'];

  it('sends the unrefined insights on the first pass', () => {
    expect(
      attackDiscoveryRefineTemplateRequest({
        alerts,
        combinedRefinements: '',
        unrefinedResults: [{ title: 'one' }],
      })
    ).toEqual({
      alerts,
      phase: 'refine',
      partial: JSON.stringify({ insights: [{ title: 'one' }] }),
    });
  });

  it('continues the partial JSON on a later pass', () => {
    expect(
      attackDiscoveryRefineTemplateRequest({
        alerts,
        combinedRefinements: '{"insights":[',
        unrefinedResults: [{ title: 'one' }],
      })
    ).toEqual({
      alerts,
      phase: 'continue',
      partial: '{"insights":[',
    });
  });
});

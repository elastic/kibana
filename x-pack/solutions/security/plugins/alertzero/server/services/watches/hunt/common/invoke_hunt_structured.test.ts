/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import { HUNT_DATASET_MATCH_TEMPLATE_ID } from './hunt_prompt_templates';
import { invokeHuntStructured } from './invoke_hunt_structured';

const schema = z.object({ dataset: z.string() });

const template = {
  id: HUNT_DATASET_MATCH_TEMPLATE_ID,
  version: 1,
  variables: { report_text: 'report' },
};

describe('invokeHuntStructured', () => {
  it('sends the prompt on a connector that accepts messages', async () => {
    const invoke = jest.fn().mockResolvedValue({ dataset: 'okta.system' });
    const chatComplete = jest.fn();
    const model = {
      connector: { connectorId: 'frontier', metadata: {} },
      chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
      inferenceClient: { chatComplete },
    } as unknown as ScopedModel;

    await expect(
      invokeHuntStructured({ model, schema, prompt: 'pick a dataset', template })
    ).resolves.toEqual({ dataset: 'okta.system' });

    expect(invoke).toHaveBeenCalledWith('pick a dataset');
    expect(chatComplete).not.toHaveBeenCalled();
  });

  it('sends the pinned template and parses the JSON object when a template is required', async () => {
    const invoke = jest.fn();
    const chatComplete = jest.fn().mockResolvedValue({
      content: '```json\n{"dataset":"okta.system"}\n```',
    });
    const model = {
      connector: {
        connectorId: 'daybreak',
        metadata: { capabilities: { templates: { policy: 'required' } } },
      },
      chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
      inferenceClient: { chatComplete },
    } as unknown as ScopedModel;

    await expect(
      invokeHuntStructured({ model, schema, prompt: 'pick a dataset', template })
    ).resolves.toEqual({ dataset: 'okta.system' });

    expect(invoke).not.toHaveBeenCalled();
    expect(chatComplete).toHaveBeenCalledWith({
      stream: false,
      messages: [{ role: 'user', content: '' }],
      template,
    });
  });

  it('uses the tier model when the gateway rejects the template', async () => {
    const rejection = Object.assign(new Error('unknown template .hunt-dataset-match'), {
      status: 400,
    });
    const chatComplete = jest.fn().mockRejectedValue(rejection);
    const invoke = jest.fn().mockResolvedValue({ dataset: 'okta.system' });
    const templateModel = {
      connector: {
        connectorId: 'daybreak',
        metadata: { capabilities: { templates: { policy: 'required' } } },
      },
      chatModel: { withStructuredOutput: jest.fn() },
      inferenceClient: { chatComplete },
    } as unknown as ScopedModel;
    const tierModel = {
      connector: { connectorId: 'frontier', metadata: {} },
      chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
      inferenceClient: { chatComplete: jest.fn() },
    } as unknown as ScopedModel;

    await expect(
      invokeHuntStructured({
        model: templateModel,
        messagesFallback: tierModel,
        schema,
        prompt: 'pick a dataset',
        template,
      })
    ).resolves.toEqual({ dataset: 'okta.system' });

    expect(invoke).toHaveBeenCalledWith('pick a dataset');
  });

  it('does not fall back when the template call fails for another reason', async () => {
    const chatComplete = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('unavailable'), { status: 503 }));
    const invoke = jest.fn();
    const templateModel = {
      connector: {
        connectorId: 'daybreak',
        metadata: { capabilities: { templates: { policy: 'required' } } },
      },
      chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
      inferenceClient: { chatComplete },
    } as unknown as ScopedModel;
    const tierModel = {
      connector: { connectorId: 'frontier', metadata: {} },
      chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
      inferenceClient: { chatComplete: jest.fn() },
    } as unknown as ScopedModel;

    await expect(
      invokeHuntStructured({
        model: templateModel,
        messagesFallback: tierModel,
        schema,
        prompt: 'pick a dataset',
        template,
      })
    ).rejects.toThrow('unavailable');
    expect(invoke).not.toHaveBeenCalled();
  });
});

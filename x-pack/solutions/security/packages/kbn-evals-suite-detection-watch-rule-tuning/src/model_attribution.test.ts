/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DIAGNOSE_STEP_ID,
  GEN_AI_DEFAULT_CONNECTOR_SETTING,
  INFERENCE_SETTINGS_ROUTE,
} from './constants';
import type { RuleTuningVerdict } from './workflow_task';
import {
  assertWorkflowModelMatches,
  expectedModelId,
  pinInferenceFeatures,
  pinWorkflowConnector,
  type ConnectorPinClient,
  type InferenceSettingsClient,
} from './model_attribution';

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

/** The live shapes: an EIS inference connector and a Gemini-style connector. */
const eisConnector = {
  id: 'eis-anthropic-claude-4-6-sonnet',
  name: 'eis-anthropic-claude-4-6-sonnet',
  actionTypeId: '.inference',
  config: {
    provider: 'elastic',
    taskType: 'chat_completion',
    inferenceId: '.anthropic-claude-4.6-sonnet-chat_completion',
    providerConfig: { model_id: 'anthropic-claude-4.6-sonnet' },
  },
};

const geminiConnector = {
  id: 'gemini',
  name: 'gemini',
  actionTypeId: '.gemini',
  config: { defaultModel: 'google-gemini-3.5-flash-lite' },
};

const probe = (over: Partial<RuleTuningVerdict> = {}): RuleTuningVerdict =>
  ({
    change_type: 'query',
    summary: 's',
    traceId: 'trace-1',
    executionId: 'exec-1',
    executionStatus: 'completed',
    stepExecutions: [{ stepId: DIAGNOSE_STEP_ID, output: { conversation_id: 'conv-1' } }],
    ...over,
  }) as unknown as RuleTuningVerdict;

const traceEsWith = (models: Array<{ model: string; chats: number }>) =>
  ({
    esql: {
      query: jest.fn(async () => ({
        columns: [
          { name: 'model', type: 'keyword' },
          { name: 'chats', type: 'long' },
        ],
        values: models.map(({ model, chats }) => [model, chats]),
      })),
    },
  }) as unknown as EsClient;

const pinClientWith = ({ readBack }: { readBack: string | null }) => {
  const update = jest.fn(async () => undefined);
  const get = jest.fn(async () => readBack);
  const waitForEventualCacheRefresh = jest.fn(async () => undefined);
  return {
    kbnClient: { uiSettings: { update, get, waitForEventualCacheRefresh } } as ConnectorPinClient,
    update,
    get,
  };
};

describe('expectedModelId', () => {
  it('reads the inference-endpoint model id', () => {
    expect(expectedModelId(eisConnector)).toBe('anthropic-claude-4.6-sonnet');
  });

  it('reads the model id off a flat inference-endpoint definition (the EIS fixture shape)', () => {
    expect(
      expectedModelId({
        id: '.anthropic-claude-5-sonnet-chat_completion',
        name: 'eis-anthropic-claude-5-sonnet',
        providerConfig: { model_id: 'anthropic-claude-5-sonnet' },
      })
    ).toBe('anthropic-claude-5-sonnet');
  });

  it('derives the model from the EIS inference id when the endpoint has no providerConfig', () => {
    expect(
      expectedModelId({
        id: '.anthropic-claude-5-sonnet-chat_completion',
        inferenceId: '.anthropic-claude-5-sonnet-chat_completion',
        name: 'eis-anthropic-claude-5-sonnet',
      })
    ).toBe('anthropic-claude-5-sonnet');
    expect(
      expectedModelId({
        id: '.anthropic-claude-5-sonnet-chat_completion',
        name: 'eis-anthropic-claude-5-sonnet',
      })
    ).toBe('anthropic-claude-5-sonnet');
  });

  it('reads defaultModel for the vendor-shaped connectors', () => {
    expect(expectedModelId(geminiConnector)).toBe('google-gemini-3.5-flash-lite');
  });

  it('falls back to the connector name', () => {
    expect(expectedModelId({ name: 'custom-connector' })).toBe('custom-connector');
  });
});

describe('pinWorkflowConnector', () => {
  it('sets the space-default connector and verifies the read-back', async () => {
    const { kbnClient, update, get } = pinClientWith({ readBack: eisConnector.id });

    await expect(pinWorkflowConnector({ kbnClient, connector: eisConnector, log })).resolves.toBe(
      eisConnector.id
    );

    expect(update).toHaveBeenCalledWith(
      { [GEN_AI_DEFAULT_CONNECTOR_SETTING]: eisConnector.id },
      { space: undefined }
    );
    expect(get).toHaveBeenCalledWith(GEN_AI_DEFAULT_CONNECTOR_SETTING, { space: undefined });
  });

  it('THROWS when the pin does not stick — a silent miss is the whole defect', async () => {
    // The un-fixed behaviour: update, no read-back, workflow quietly runs the
    // stack default while the score docs name the eval connector's model.
    const { kbnClient } = pinClientWith({ readBack: '.anthropic-claude-5-sonnet-chat_completion' });

    await expect(pinWorkflowConnector({ kbnClient, connector: eisConnector, log })).rejects.toThrow(
      /did not stick/
    );
  });

  it('THROWS when the connector fixture has no id', async () => {
    const { kbnClient } = pinClientWith({ readBack: null });

    await expect(
      pinWorkflowConnector({ kbnClient, connector: { name: 'nameless' }, log })
    ).rejects.toThrow(/no id/);
  });
});

interface StoredFeature {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

/** A fake Model Management endpoint: PUT replaces the document, GET returns it. */
const inferenceSettingsServer = ({
  initial = [],
  dropFromStored = [],
}: {
  initial?: StoredFeature[];
  /** Feature ids the server silently fails to persist, to exercise the read-back. */
  dropFromStored?: string[];
} = {}) => {
  let stored = initial;
  const request = jest.fn(async ({ method, body }: { method: string; body?: unknown }) => {
    if (method === 'PUT') {
      stored = (body as { features: StoredFeature[] }).features.filter(
        ({ feature_id: id }) => !dropFromStored.includes(id)
      );
    }
    return { data: { data: { features: stored } } };
  });
  return { kbnClient: { request } as unknown as InferenceSettingsClient, request };
};

const putBody = (request: jest.Mock) =>
  request.mock.calls.find(([{ method }]) => method === 'PUT')![0] as {
    path: string;
    headers: Record<string, string>;
    body: { features: StoredFeature[] };
  };

describe('pinInferenceFeatures', () => {
  it('writes the eval connector onto every alertzero tier and agent-builder feature', async () => {
    const { kbnClient, request } = inferenceSettingsServer();

    await pinInferenceFeatures({ kbnClient, connector: eisConnector, log });

    const put = putBody(request);
    expect(put.path).toBe(INFERENCE_SETTINGS_ROUTE);
    expect(put.headers).toMatchObject({ 'elastic-api-version': '1' });
    expect(put.body.features).toEqual(
      expect.arrayContaining(
        [
          'alertzero_agentic',
          'alertzero_fast',
          'alertzero_reasoning',
          'agent_builder',
          'agent_builder_fast',
        ].map((feature_id) => ({ feature_id, endpoints: [{ id: eisConnector.id }] }))
      )
    );
  });

  it('keeps picks for unrelated features and replaces a stale pick for a pinned one', async () => {
    const { kbnClient, request } = inferenceSettingsServer({
      initial: [
        { feature_id: 'other_feature', endpoints: [{ id: 'keep-me' }] },
        {
          feature_id: 'alertzero_agentic',
          endpoints: [{ id: '.anthropic-claude-5-sonnet-chat_completion' }],
        },
      ],
    });

    await pinInferenceFeatures({ kbnClient, connector: eisConnector, log });

    const { features } = putBody(request).body;
    expect(features).toContainEqual({
      feature_id: 'other_feature',
      endpoints: [{ id: 'keep-me' }],
    });
    expect(features.filter(({ feature_id: id }) => id === 'alertzero_agentic')).toEqual([
      { feature_id: 'alertzero_agentic', endpoints: [{ id: eisConnector.id }] },
    ]);
  });

  it('THROWS naming the feature when the read-back does not carry the connector', async () => {
    const { kbnClient } = inferenceSettingsServer({ dropFromStored: ['alertzero_agentic'] });

    await expect(pinInferenceFeatures({ kbnClient, connector: eisConnector, log })).rejects.toThrow(
      /did not stick for alertzero_agentic/
    );
  });

  it('THROWS when the connector fixture has no id, before touching the stack', async () => {
    const { kbnClient, request } = inferenceSettingsServer();

    await expect(
      pinInferenceFeatures({ kbnClient, connector: { name: 'nameless' }, log })
    ).rejects.toThrow(/no id/);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('assertWorkflowModelMatches', () => {
  it('verifies the model when a chat span names it', async () => {
    await expect(
      assertWorkflowModelMatches({
        traceEsClient: traceEsWith([{ model: 'anthropic-claude-4.6-sonnet', chats: 12 }]),
        probe: probe(),
        connector: eisConnector,
        log,
      })
    ).resolves.toBe('anthropic-claude-4.6-sonnet');
  });

  it('tolerates separator/case differences in the model id', async () => {
    await expect(
      assertWorkflowModelMatches({
        traceEsClient: traceEsWith([{ model: 'anthropic_claude_4_6_SONNET', chats: 3 }]),
        probe: probe(),
        connector: eisConnector,
        log,
      })
    ).resolves.toBe('anthropic-claude-4.6-sonnet');
  });

  it('THROWS with the observed models when the trace ran a different model', async () => {
    // This is the AZ-3e mismatch: the score doc said 4.6 while the spans said 5.
    await expect(
      assertWorkflowModelMatches({
        traceEsClient: traceEsWith([{ model: 'anthropic-claude-5-sonnet', chats: 4744 }]),
        probe: probe(),
        connector: eisConnector,
        log,
      })
    ).rejects.toThrow(/anthropic-claude-5-sonnet \(4744 chat span\(s\)\)/);
  });

  it('THROWS when no chat span is reachable at all', async () => {
    await expect(
      assertWorkflowModelMatches({
        traceEsClient: traceEsWith([]),
        probe: probe(),
        connector: eisConnector,
        log,
      })
    ).rejects.toThrow(/No chat spans reachable/);
  });

  it('THROWS when the connector carries no model id and no name', async () => {
    await expect(
      assertWorkflowModelMatches({
        traceEsClient: traceEsWith([{ model: 'x', chats: 1 }]),
        probe: probe(),
        connector: {},
        log,
      })
    ).rejects.toThrow(/cannot verify model attribution/i);
  });
});

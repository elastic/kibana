/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { aesopCaptureDatasetStepDefinition } from './aesop_capture_dataset_step';

type Context = Parameters<typeof aesopCaptureDatasetStepDefinition.handler>[0];
interface ApiCall {
  method?: string;
  path: string;
  headers?: Record<string, string>;
  body?: { examples?: unknown[] };
}

const upsertCall = (callKibanaApi: jest.Mock<unknown, [ApiCall]>) =>
  callKibanaApi.mock.calls.map(([call]) => call).find((call) => call.method === 'POST');

const conversation = (id: string, message: string) => ({
  id,
  agent_id: 'agent-1',
  rounds: [
    { id: `${id}-r1`, status: 'completed', input: { message }, response: { message: 'answer' } },
  ],
});

const notFound = () =>
  new KibanaApiCallError({ status: 404, headers: {}, body: {}, message: 'not found' });

const run = async (callKibanaApi: jest.Mock<unknown, [ApiCall]>, input: Record<string, unknown>) =>
  aesopCaptureDatasetStepDefinition.handler({
    input: { agent_id: 'agent-1', query: 'alert', dataset_name: 'ds', ...input },
    contextManager: { callKibanaApi },
  } as unknown as Context);

describe('aesopCaptureDatasetStepDefinition', () => {
  it('returns an error for invalid input', async () => {
    const callKibanaApi = jest.fn<unknown, [ApiCall]>();
    const result = await aesopCaptureDatasetStepDefinition.handler({
      input: { agent_id: '' },
      contextManager: { callKibanaApi },
    } as unknown as Context);
    expect(result.error?.message).toContain('Invalid input');
    expect(callKibanaApi).not.toHaveBeenCalled();
  });

  it('creates the dataset when none exists yet', async () => {
    const callKibanaApi = jest.fn(async ({ method, path }: ApiCall) => {
      if (path.endsWith('/_search')) return { body: { results: [{ id: 'c1' }] } };
      if (path === '/api/agent_builder/conversations/c1') return { body: conversation('c1', 'why open') };
      if (path.endsWith('/_resolve')) throw notFound();
      if (method === 'POST') {
        return { body: { dataset_id: 'new', added: 1, removed: 0, unchanged: 0 } };
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    const result = await run(callKibanaApi, { tags: ['t'] });

    expect(result.output).toEqual({
      dataset_id: 'new',
      conversations_read: 1,
      captured: 1,
      skipped_duplicates: 0,
      added: 1,
      removed: 0,
      unchanged: 0,
    });
    const upsert = upsertCall(callKibanaApi);
    expect(upsert?.path).toBe('/internal/evals/datasets/_upsert');
    expect(upsert?.body).toMatchObject({ name: 'ds', tags: ['t'] });
    expect(upsert?.body?.examples).toHaveLength(1);
  });

  it('reads each conversation from the public route with its API version', async () => {
    const callKibanaApi = jest.fn(async ({ method, path }: ApiCall) => {
      if (path.endsWith('/_search')) return { body: { results: [{ id: 'c1' }] } };
      if (path.endsWith('/_resolve')) throw notFound();
      if (method === 'POST') {
        return { body: { dataset_id: 'new', added: 1, removed: 0, unchanged: 0 } };
      }
      return { body: conversation('c1', 'why open') };
    });

    await run(callKibanaApi, {});

    const reads = callKibanaApi.mock.calls
      .map(([call]) => call)
      .filter((call) => call.path.includes('/conversations/') && !call.path.endsWith('/_search'));
    expect(reads).toHaveLength(1);
    expect(reads[0].path).toBe('/api/agent_builder/conversations/c1');
    expect(reads[0].headers).toEqual({ 'elastic-api-version': '2023-10-31' });
  });

  it('sends existing examples along with the new ones and drops duplicates', async () => {
    const existingExample = {
      id: 'e1',
      input: { message: 'why open' },
      output: { message: 'old' },
      created_at: 'x',
      updated_at: 'y',
    };
    const callKibanaApi = jest.fn(async ({ method, path }: ApiCall) => {
      if (path.endsWith('/_search')) return { body: { results: [{ id: 'c1' }, { id: 'c2' }] } };
      if (path === '/api/agent_builder/conversations/c1') return { body: conversation('c1', 'why open') };
      if (path === '/api/agent_builder/conversations/c2') return { body: conversation('c2', 'list rules') };
      if (path.endsWith('/_resolve')) return { body: { id: 'ds-1' } };
      if (path.endsWith('/ds-1')) return { body: { id: 'ds-1', examples: [existingExample] } };
      if (method === 'POST') {
        return { body: { dataset_id: 'ds-1', added: 1, removed: 0, unchanged: 1 } };
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    const result = await run(callKibanaApi, {});

    expect(result.output).toMatchObject({ captured: 2, skipped_duplicates: 1, added: 1 });
    const upsert = upsertCall(callKibanaApi);
    expect(upsert?.body?.examples).toEqual([
      { input: { message: 'why open' }, output: { message: 'old' } },
      expect.objectContaining({ input: { message: 'list rules' } }),
    ]);
  });

  it('does not upsert when every captured example is a duplicate', async () => {
    const callKibanaApi = jest.fn(async ({ path }: ApiCall) => {
      if (path.endsWith('/_search')) return { body: { results: [{ id: 'c1' }] } };
      if (path === '/api/agent_builder/conversations/c1') return { body: conversation('c1', 'why open') };
      if (path.endsWith('/_resolve')) return { body: { id: 'ds-1' } };
      return { body: { id: 'ds-1', examples: [{ input: { message: 'why open' } }] } };
    });

    const result = await run(callKibanaApi, {});

    expect(result.output).toMatchObject({ dataset_id: 'ds-1', added: 0, unchanged: 1 });
    expect(upsertCall(callKibanaApi)).toBeUndefined();
  });

  it('passes an API failure through as the step error', async () => {
    const callKibanaApi = jest
      .fn<Promise<unknown>, [ApiCall]>()
      .mockRejectedValue(new Error('boom'));
    const result = await run(callKibanaApi, {});
    expect(result.error?.message).toBe('boom');
  });
});

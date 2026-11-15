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
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: { examples?: unknown[]; description?: string; tags?: string[] };
}

const upsertCall = (callKibanaApi: jest.Mock<unknown, [ApiCall]>) =>
  callKibanaApi.mock.calls.map(([call]) => call).find((call) => call.method === 'POST');

const LIST_PATH = '/api/agent_builder/conversations';
const isList = (path: string) => path === LIST_PATH;
const listed = (...ids: string[]) => ({
  body: {
    results: ids.map((id) => ({ id, title: `Alert ${id}` })),
    pagination: { total: ids.length },
  },
});

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
      if (isList(path)) return listed('c1');
      if (path === '/api/agent_builder/conversations/c1')
        return { body: conversation('c1', 'why open') };
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
      if (isList(path)) return listed('c1');
      if (path.endsWith('/_resolve')) throw notFound();
      if (method === 'POST') {
        return { body: { dataset_id: 'new', added: 1, removed: 0, unchanged: 0 } };
      }
      return { body: conversation('c1', 'why open') };
    });

    await run(callKibanaApi, {});

    const reads = callKibanaApi.mock.calls
      .map(([call]) => call)
      .filter((call) => call.path.includes('/conversations/'));
    expect(reads).toHaveLength(1);
    expect(reads[0].path).toBe('/api/agent_builder/conversations/c1');
    expect(reads[0].headers).toEqual({ 'elastic-api-version': '2023-10-31' });
  });

  it('lists the agent conversations on the public route and filters titles locally', async () => {
    const callKibanaApi = jest.fn(async ({ method, path }: ApiCall) => {
      if (isList(path)) {
        return {
          body: {
            results: [
              { id: 'c1', title: 'Why is this ALERT open' },
              { id: 'c2', title: 'Unrelated chat' },
              { id: 'c3' },
            ],
            pagination: { total: 3 },
          },
        };
      }
      if (path.endsWith('/_resolve')) throw notFound();
      if (method === 'POST') {
        return { body: { dataset_id: 'new', added: 1, removed: 0, unchanged: 0 } };
      }
      return { body: conversation('c1', 'why open') };
    });

    const result = await run(callKibanaApi, { query: 'alert' });

    const calls = callKibanaApi.mock.calls.map(([call]) => call);
    const list = calls.find((call) => isList(call.path));
    expect(list?.method).toBe('GET');
    expect(list?.headers).toEqual({ 'elastic-api-version': '2023-10-31' });
    expect(list?.query).toMatchObject({ agent_id: 'agent-1', page: 1, per_page: 100 });
    expect(result.output).toMatchObject({ conversations_read: 1 });
    expect(calls.filter((call) => call.path.includes('/conversations/'))).toHaveLength(1);
    expect(calls.some((call) => call.path.includes('/_search'))).toBe(false);
  });

  it('pages the list, stops at max_conversations and caps the scan at five pages', async () => {
    const page = (n: number) =>
      Array.from({ length: 100 }, (_, i) => ({ id: `c${n}-${i}`, title: 'alert' }));
    const callKibanaApi = jest.fn(async ({ method, path, query }: ApiCall) => {
      if (isList(path)) {
        return { body: { results: page(Number(query?.page)), pagination: { total: 10_000 } } };
      }
      if (path.endsWith('/_resolve')) throw notFound();
      if (method === 'POST') {
        return { body: { dataset_id: 'new', added: 1, removed: 0, unchanged: 0 } };
      }
      return { body: conversation('c', 'why open') };
    });

    await run(callKibanaApi, { max_conversations: 50 });
    const listCalls = () =>
      callKibanaApi.mock.calls.map(([call]) => call).filter((call) => isList(call.path));
    expect(listCalls()).toHaveLength(1);

    callKibanaApi.mockClear();
    await run(callKibanaApi, { query: 'no-title-matches' });
    expect(listCalls()).toHaveLength(5);
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
      if (isList(path)) return listed('c1', 'c2');
      if (path === '/api/agent_builder/conversations/c1')
        return { body: conversation('c1', 'why open') };
      if (path === '/api/agent_builder/conversations/c2')
        return { body: conversation('c2', 'list rules') };
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

  it("keeps an existing dataset's description and tags when the input omits them", async () => {
    const callKibanaApi = jest.fn(async ({ method, path }: ApiCall) => {
      if (isList(path)) return listed('c1');
      if (path === '/api/agent_builder/conversations/c1')
        return { body: conversation('c1', 'list rules') };
      if (path.endsWith('/_resolve')) return { body: { id: 'ds-1' } };
      if (path.endsWith('/ds-1')) {
        return { body: { id: 'ds-1', description: 'hand-written', examples: [] } };
      }
      if (method === 'POST') {
        return { body: { dataset_id: 'ds-1', added: 1, removed: 0, unchanged: 0 } };
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await run(callKibanaApi, {});

    const body = upsertCall(callKibanaApi)?.body;
    expect(body?.description).toBe('hand-written');
    expect(body?.tags).toBeUndefined();
  });

  it('uses the default description for a new dataset', async () => {
    const callKibanaApi = jest.fn(async ({ method, path }: ApiCall) => {
      if (isList(path)) return listed('c1');
      if (path === '/api/agent_builder/conversations/c1')
        return { body: conversation('c1', 'list rules') };
      if (path.endsWith('/_resolve')) throw notFound();
      if (method === 'POST') {
        return { body: { dataset_id: 'ds-1', added: 1, removed: 0, unchanged: 0 } };
      }
      throw new Error(`unexpected ${method} ${path}`);
    });

    await run(callKibanaApi, {});

    expect(upsertCall(callKibanaApi)?.body?.description).toBe('Captured by AESOP');
  });

  it('does not upsert when every captured example is a duplicate', async () => {
    const callKibanaApi = jest.fn(async ({ path }: ApiCall) => {
      if (isList(path)) return listed('c1');
      if (path === '/api/agent_builder/conversations/c1')
        return { body: conversation('c1', 'why open') };
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

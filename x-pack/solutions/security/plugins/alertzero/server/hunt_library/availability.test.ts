/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  buildAvailabilityCacheKey,
  checkHuntAvailability,
  HuntAvailabilityCache,
  PROBE_TIMEOUT_MS,
  uncoveredByScope,
} from './availability';
import { getHuntDefinition } from './seed';

const definition = getHuntDefinition('rare_lsass_process_access')!;
const { requiredIndexPatterns, requiredFields } = definition.query;

const fieldCapsFor = (types: Record<string, string[]> = {}) => ({
  fields: Object.fromEntries(
    requiredFields
      .filter((field) => types[field] !== undefined || Object.keys(types).length === 0)
      .map((field) => [
        field,
        Object.fromEntries(
          (types[field] ?? ['keyword']).map((type) => [type, { type, searchable: true }])
        ),
      ])
  ),
});

const makeClient = () => ({
  indices: {
    resolveIndex: jest.fn().mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [{ name: 'logs-endpoint.events.api-default', backing_indices: [] }],
    }),
  },
  fieldCaps: jest.fn().mockResolvedValue(fieldCapsFor()),
  esql: { query: jest.fn().mockResolvedValue({ columns: [], values: [] }) },
});

const run = (
  client: ReturnType<typeof makeClient>,
  overrides: Partial<Parameters<typeof checkHuntAvailability>[0]> = {}
) =>
  checkHuntAvailability({
    esClient: client as never,
    definition,
    identity: 'caller',
    checkScope: () => ({ details: [] }),
    probe: true,
    logger: loggingSystemMock.createLogger(),
    ...overrides,
  });

describe('uncoveredByScope', () => {
  it('treats a wildcard scope pattern as covering a narrower required pattern', () => {
    expect(uncoveredByScope(['logs-*'], ['logs-endpoint.events.api*'])).toEqual([]);
  });

  it('reports required patterns no scope pattern covers', () => {
    expect(uncoveredByScope(['filebeat-*'], ['logs-endpoint.events.api*'])).toEqual([
      'logs-endpoint.events.api*',
    ]);
  });

  it('never lets an exclusion grant scope', () => {
    expect(uncoveredByScope(['-logs-*'], ['logs-endpoint.events.api*'])).toEqual([
      'logs-endpoint.events.api*',
    ]);
  });
});

describe('checkHuntAvailability', () => {
  it('is available when scope, index, mapping and probe all pass', async () => {
    const client = makeClient();

    expect(await run(client)).toEqual({
      identity: 'caller',
      available: true,
      firstFailure: null,
      failures: [],
      probe: 'passed',
    });
    expect(client.indices.resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: requiredIndexPatterns })
    );
  });

  it('stops at scope and runs no Elasticsearch check when scope fails', async () => {
    const client = makeClient();

    const result = await run(client, {
      checkScope: () => ({ details: ['logs-endpoint.events.api*'] }),
    });

    expect(result.firstFailure).toBe('unavailable_scope');
    expect(result.probe).toBe('skipped');
    expect(client.indices.resolveIndex).not.toHaveBeenCalled();
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('reports a pattern that resolves to nothing as unavailable_index', async () => {
    const client = makeClient();
    client.indices.resolveIndex.mockResolvedValue({ indices: [], aliases: [], data_streams: [] });

    const result = await run(client);

    expect(result.firstFailure).toBe('unavailable_index');
    expect(result.failures[0].details).toEqual(requiredIndexPatterns);
    expect(client.fieldCaps).not.toHaveBeenCalled();
  });

  it('is available when only some of several alternative source patterns resolve', async () => {
    const client = makeClient();
    const union = getHuntDefinition('rare_rundll32_command_line')!;
    client.indices.resolveIndex.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [{ name: 'logs-endpoint.events.process-default', backing_indices: [] }],
    });
    client.fieldCaps.mockImplementation(async ({ fields }: { fields: string[] }) => ({
      fields: Object.fromEntries(
        fields.map((field) => [field, { keyword: { type: 'keyword', searchable: true } }])
      ),
    }));

    const result = await run(client, { definition: union });

    expect(union.query.requiredIndexPatterns.length).toBeGreaterThan(1);
    expect(result.available).toBe(true);
  });

  it('reports a 403 from the resolve as a scope failure', async () => {
    const client = makeClient();
    client.indices.resolveIndex.mockRejectedValue({ statusCode: 403 });

    expect((await run(client)).firstFailure).toBe('unavailable_scope');
  });

  it('reports missing, conflicting and nested fields as unavailable_mapping', async () => {
    const client = makeClient();
    const caps = fieldCapsFor();
    delete caps.fields['host.id'];
    caps.fields['process.Ext.api.name'] = {
      keyword: { type: 'keyword', searchable: true },
      long: { type: 'long', searchable: true },
    } as never;
    caps.fields['event.category'] = { nested: { type: 'nested', searchable: false } } as never;
    client.fieldCaps.mockResolvedValue(caps);

    const result = await run(client);

    expect(result.firstFailure).toBe('unavailable_mapping');
    expect(result.failures[0].details).toEqual(
      expect.arrayContaining([
        'missing:host.id',
        'conflict:process.Ext.api.name',
        'nested:event.category',
      ])
    );
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('does not call keyword and constant_keyword a conflict', async () => {
    const client = makeClient();
    const caps = fieldCapsFor();
    caps.fields['host.os.family'] = {
      keyword: { type: 'keyword', searchable: true },
      constant_keyword: { type: 'constant_keyword', searchable: true },
    } as never;
    client.fieldCaps.mockResolvedValue(caps);

    expect((await run(client)).available).toBe(true);
  });

  it('probes with LIMIT 0, the definition time range and a 5 second timeout', async () => {
    const client = makeClient();

    await run(client);

    const [params, options] = client.esql.query.mock.calls[0];
    expect(params.query.endsWith('\n| LIMIT 0')).toBe(true);
    expect(params.filter.range['@timestamp']).toEqual({
      gte: definition.query.defaultTimeRange.from,
      lte: definition.query.defaultTimeRange.to,
    });
    expect(options).toEqual({ requestTimeout: PROBE_TIMEOUT_MS });
  });

  it('falls back to LIMIT 1 when LIMIT 0 is rejected with a 400', async () => {
    const client = makeClient();
    client.esql.query.mockRejectedValueOnce({ statusCode: 400 });

    const result = await run(client);

    expect(client.esql.query).toHaveBeenCalledTimes(2);
    expect(client.esql.query.mock.calls[1][0].query.endsWith('\n| LIMIT 1')).toBe(true);
    expect(result.probe).toBe('passed');
  });

  it('reports a failing probe and a timed out probe as probe_failed', async () => {
    const failing = makeClient();
    failing.esql.query.mockRejectedValue({ statusCode: 500, message: 'boom\nstack' });
    const timedOut = makeClient();
    timedOut.esql.query.mockRejectedValue({ name: 'TimeoutError' });

    const failed = await run(failing);
    const timeout = await run(timedOut);

    expect(failed.failures[0]).toEqual({ reason: 'probe_failed', details: ['boom'] });
    expect(failed.probe).toBe('failed');
    expect(timeout.failures[0].details).toEqual(['probe_timeout']);
  });

  it('does not probe when the identity cannot be probed as itself', async () => {
    const client = makeClient();

    const result = await run(client, { identity: 'worker', probe: false });

    expect(result.available).toBe(true);
    expect(result.probe).toBe('skipped');
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('keeps first-failure precedence scope, index, mapping, probe', async () => {
    const client = makeClient();
    client.esql.query.mockRejectedValue({ statusCode: 500, message: 'x' });

    expect((await run(client)).firstFailure).toBe('probe_failed');
  });
});

describe('HuntAvailabilityCache', () => {
  const available = {
    identity: 'caller',
    available: true,
    firstFailure: null,
    failures: [],
    probe: 'passed',
  } as const;

  it('serves a result for 60 seconds, then recomputes', async () => {
    let now = 0;
    const cache = new HuntAvailabilityCache(60_000, 500, () => now);
    const compute = jest.fn().mockResolvedValue(available);

    await cache.get('k', compute);
    now = 59_999;
    await cache.get('k', compute);
    expect(compute).toHaveBeenCalledTimes(1);

    now = 60_000;
    await cache.get('k', compute);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight check between concurrent callers', async () => {
    const cache = new HuntAvailabilityCache();
    const compute = jest.fn().mockResolvedValue(available);

    await Promise.all([cache.get('k', compute), cache.get('k', compute)]);

    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('does not remember a failed check', async () => {
    const cache = new HuntAvailabilityCache();
    const compute = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(available);

    await expect(cache.get('k', compute)).rejects.toThrow('down');
    await Promise.resolve();
    await cache.get('k', compute);

    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('bounds its size', async () => {
    const cache = new HuntAvailabilityCache(60_000, 2);
    const compute = jest.fn().mockResolvedValue(available);

    await cache.get('a', compute);
    await cache.get('b', compute);
    await cache.get('c', compute);
    await cache.get('a', compute);

    expect(compute).toHaveBeenCalledTimes(4);
  });
});

describe('buildAvailabilityCacheKey', () => {
  const base = { spaceId: 's', definition: { id: 'h', version: 1 } };

  it('separates caller results per user and per space, but shares the worker result', () => {
    const callerA = buildAvailabilityCacheKey({ ...base, identity: 'caller', userKey: 'a' });
    const callerB = buildAvailabilityCacheKey({ ...base, identity: 'caller', userKey: 'b' });
    const workerA = buildAvailabilityCacheKey({ ...base, identity: 'worker', userKey: 'a' });
    const workerB = buildAvailabilityCacheKey({ ...base, identity: 'worker', userKey: 'b' });
    const otherSpace = buildAvailabilityCacheKey({
      ...base,
      spaceId: 't',
      identity: 'caller',
      userKey: 'a',
    });

    expect(callerA).not.toBe(callerB);
    expect(callerA).not.toBe(otherSpace);
    expect(workerA).toBe(workerB);
  });

  it('includes the definition version', () => {
    const v1 = buildAvailabilityCacheKey({ ...base, identity: 'worker' });
    const v2 = buildAvailabilityCacheKey({
      ...base,
      definition: { id: 'h', version: 2 },
      identity: 'worker',
    });

    expect(v1).not.toBe(v2);
  });
});

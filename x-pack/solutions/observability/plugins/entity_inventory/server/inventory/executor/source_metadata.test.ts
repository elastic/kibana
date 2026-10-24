/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  FieldCapsResponse,
  IndicesGetResponse,
  SecurityHasPrivilegesResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { QueryPlan } from '../generator';
import {
  planAvailability,
  resolveFieldAvailability,
  resolveSourceIndices,
} from './source_metadata';

const createClient = () => elasticsearchServiceMock.createElasticsearchClient();

const responseError = (statusCode: number, body?: Record<string, object>) =>
  new errors.ResponseError(elasticsearchServiceMock.createApiResponse({ statusCode, body }));

const ts = { settings: { index: { mode: 'time_series' } } };
const logsdb = { settings: { index: { mode: 'logsdb' } } };
const defaultsOnly = { defaults: { index: { mode: 'standard' } } };

const privileges = (
  index: Record<string, { read: boolean; read_failure_store?: boolean }>
): SecurityHasPrivilegesResponse => ({
  username: 'u',
  has_all_requested: false,
  cluster: {},
  application: {},
  index,
});

describe('resolveSourceIndices', () => {
  const options = { checkReadability: false };

  it('reads time series indices', async () => {
    const client = createClient();
    client.indices.get.mockResolvedValue({
      '.ds-m-2': { ...ts, data_stream: 'm' },
      '.ds-m-1': { ...ts, data_stream: 'm' },
    } as IndicesGetResponse);
    const result = await resolveSourceIndices(client, ['m'], options);
    expect(result.get('m')).toEqual({
      usable: true,
      indices: [
        { name: '.ds-m-1', mode: 'time_series' },
        { name: '.ds-m-2', mode: 'time_series' },
      ],
    });
    expect(client.indices.get).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'm',
        include_defaults: true,
        expand_wildcards: ['open', 'hidden'],
      })
    );
  });

  it('treats logsdb and a defaults-only index as standard', async () => {
    const client = createClient();
    client.indices.get.mockResolvedValue({
      a: ts,
      b: logsdb,
      c: defaultsOnly,
    } as IndicesGetResponse);
    const result = await resolveSourceIndices(client, ['x*'], options);
    expect(result.get('x*')).toEqual({
      usable: true,
      indices: [
        { name: 'a', mode: 'time_series' },
        { name: 'b', mode: 'standard' },
        { name: 'c', mode: 'standard' },
      ],
    });
  });

  it('reports a pattern that matches no index', async () => {
    const client = createClient();
    client.indices.get.mockResolvedValue({});
    const result = await resolveSourceIndices(client, ['none-*'], options);
    expect(result.get('none-*')).toEqual({
      usable: false,
      cause: 'no_matching_index',
      status: null,
      reason: '"none-*" matches no index',
    });
  });

  it('reports a failed settings call with the status and reason from the body', async () => {
    const client = createClient();
    client.indices.get.mockRejectedValue(
      responseError(400, {
        error: { type: 'illegal_argument_exception', reason: 'remote indices were requested' },
      })
    );
    const result = await resolveSourceIndices(client, ['remote:x'], options);
    expect(result.get('remote:x')).toEqual({
      usable: false,
      cause: 'settings_failed',
      status: 400,
      reason:
        'index settings request failed: illegal_argument_exception: remote indices were requested',
    });
  });

  it('reports a failed settings call without a body', async () => {
    const client = createClient();
    client.indices.get.mockRejectedValue(responseError(502));
    const result = await resolveSourceIndices(client, ['m'], options);
    expect(result.get('m')).toEqual({
      usable: false,
      cause: 'settings_failed',
      status: 502,
      reason: 'index settings request failed: Response Error',
    });
  });

  it('resolves a duplicate pattern once', async () => {
    const client = createClient();
    client.indices.get.mockResolvedValue({ a: ts } as IndicesGetResponse);
    const result = await resolveSourceIndices(client, ['m', 'm'], options);
    expect(client.indices.get).toHaveBeenCalledTimes(1);
    expect([...result.keys()]).toEqual(['m']);
  });

  it('skips the privilege check when readability is not checked', async () => {
    const client = createClient();
    client.indices.get.mockResolvedValue({ a: ts } as IndicesGetResponse);
    await resolveSourceIndices(client, ['m'], options);
    expect(client.security.hasPrivileges).not.toHaveBeenCalled();
  });

  describe('readability', () => {
    it('removes unreadable indices with one privilege call for every pattern', async () => {
      const client = createClient();
      client.indices.get
        .mockResolvedValueOnce({ a: defaultsOnly, b: defaultsOnly } as IndicesGetResponse)
        .mockResolvedValueOnce({ '.ds-s-1': { ...ts, data_stream: 's' } } as IndicesGetResponse);
      client.security.hasPrivileges.mockResolvedValue(
        privileges({
          a: { read: true },
          b: { read: false },
          '.ds-s-1': { read: false },
          // Granted on the stream: the backing index is readable through it.
          s: { read: true },
        })
      );
      const result = await resolveSourceIndices(client, ['one', 's'], { checkReadability: true });
      expect(client.security.hasPrivileges).toHaveBeenCalledTimes(1);
      expect(client.security.hasPrivileges).toHaveBeenCalledWith({
        index: [{ names: ['.ds-s-1', 'a', 'b', 's'], privileges: ['read', 'read_failure_store'] }],
      });
      expect(result.get('one')).toEqual({
        usable: true,
        indices: [{ name: 'a', mode: 'standard' }],
      });
      expect(result.get('s')).toEqual({
        usable: true,
        indices: [{ name: '.ds-s-1', mode: 'time_series' }],
      });
    });

    it('reports a pattern whose every index is unreadable', async () => {
      const client = createClient();
      client.indices.get.mockResolvedValue({
        '.ds-s-1': { ...ts, data_stream: 's' },
        '.fs-s-1': { ...defaultsOnly, data_stream: 's' },
      } as IndicesGetResponse);
      client.security.hasPrivileges.mockResolvedValue(
        privileges({
          '.ds-s-1': { read: false },
          '.fs-s-1': { read: false },
          s: { read: false, read_failure_store: false },
        })
      );
      const result = await resolveSourceIndices(client, ['s'], { checkReadability: true });
      expect(result.get('s')).toEqual({
        usable: false,
        cause: 'not_readable',
        status: null,
        reason: 'the current user cannot read any index behind "s"',
      });
    });

    it('needs read_failure_store on the stream for a failure store index', async () => {
      const client = createClient();
      client.indices.get.mockResolvedValue({
        '.fs-s-1': { ...defaultsOnly, data_stream: 's' },
      } as IndicesGetResponse);
      // `read` on the failure store index's own name does not count.
      client.security.hasPrivileges.mockResolvedValue(
        privileges({ '.fs-s-1': { read: true }, s: { read: true, read_failure_store: false } })
      );
      const result = await resolveSourceIndices(client, ['s::failures'], {
        checkReadability: true,
      });
      expect(result.get('s::failures')).toMatchObject({ usable: false, cause: 'not_readable' });
    });

    it('reads a failure store index through read_failure_store on its stream', async () => {
      const client = createClient();
      client.indices.get.mockResolvedValue({
        '.fs-s-1': { ...defaultsOnly, data_stream: 's' },
      } as IndicesGetResponse);
      client.security.hasPrivileges.mockResolvedValue(
        privileges({ '.fs-s-1': { read: false }, s: { read: false, read_failure_store: true } })
      );
      const result = await resolveSourceIndices(client, ['s::failures'], {
        checkReadability: true,
      });
      expect(result.get('s::failures')).toEqual({
        usable: true,
        indices: [{ name: '.fs-s-1', mode: 'standard' }],
      });
    });

    it('makes every resolved pattern unusable when the privilege check fails', async () => {
      const client = createClient();
      client.indices.get
        .mockResolvedValueOnce({ a: defaultsOnly } as IndicesGetResponse)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(responseError(502));
      client.security.hasPrivileges.mockRejectedValue(
        responseError(500, {
          error: { type: 'security_exception', reason: 'realm unavailable' },
        })
      );
      const result = await resolveSourceIndices(client, ['one', 'none-*', 'broken'], {
        checkReadability: true,
      });
      expect(result.get('one')).toEqual({
        usable: false,
        cause: 'privilege_check_failed',
        status: 500,
        reason: 'privilege check failed: security_exception: realm unavailable',
      });
      expect(result.get('none-*')).toMatchObject({ usable: false, cause: 'no_matching_index' });
      expect(result.get('broken')).toMatchObject({
        usable: false,
        cause: 'settings_failed',
        status: 502,
      });
    });
  });
});

const caps = (indices: string[], fields: FieldCapsResponse['fields']): FieldCapsResponse => ({
  indices,
  fields,
});

const capability = (indices?: string[]) => ({
  type: 'keyword',
  metadata_field: false,
  searchable: true,
  aggregatable: true,
  ...(indices ? { indices } : {}),
});

describe('resolveFieldAvailability', () => {
  it('asks once for every pattern and narrows the answer per pattern', async () => {
    const client = createClient();
    client.fieldCaps.mockResolvedValue(
      caps(['a', 'b'], {
        'host.name': { keyword: capability(['a']), unmapped: capability(['b']) },
        'os.name': { keyword: capability() },
      })
    );
    const result = await resolveFieldAvailability(client, [
      { indexPattern: 'p1', indices: ['a'], fields: ['host.name'] },
      { indexPattern: 'p2', indices: ['b'], fields: ['host.name', 'os.name'] },
      { indexPattern: 'p3', indices: ['c'], fields: [] },
    ]);
    expect(client.fieldCaps).toHaveBeenCalledTimes(1);
    expect(client.fieldCaps).toHaveBeenCalledWith({
      index: ['p1', 'p2'],
      fields: ['host.name', 'os.name'],
      include_unmapped: true,
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: ['open', 'hidden'],
      filters: '-metadata',
    });
    expect(result.get('p1')).toEqual({
      failed: false,
      mappedByIndex: new Map([['a', new Set(['host.name'])]]),
    });
    expect(result.get('p2')).toEqual({
      failed: false,
      mappedByIndex: new Map([['b', new Set(['os.name'])]]),
    });
    expect(result.get('p3')).toEqual({ failed: false, mappedByIndex: new Map([['c', new Set()]]) });
  });

  it('ignores indices the pattern reaches that are not among its resolved indices', async () => {
    const client = createClient();
    client.fieldCaps.mockResolvedValue(
      caps(['a', 'late'], {
        'host.name': { keyword: capability() },
      })
    );
    const result = await resolveFieldAvailability(client, [
      { indexPattern: 'p*', indices: ['a', 'gone'], fields: ['host.name'] },
    ]);
    expect(client.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({ index: ['p*'], fields: ['host.name'] })
    );
    expect(result.get('p*')).toEqual({
      failed: false,
      mappedByIndex: new Map([
        ['a', new Set(['host.name'])],
        ['gone', new Set()],
      ]),
    });
  });

  it('makes no call when nothing needs asking', async () => {
    const client = createClient();
    await resolveFieldAvailability(client, [{ indexPattern: 'p', indices: ['a'], fields: [] }]);
    expect(client.fieldCaps).not.toHaveBeenCalled();
  });

  it('retries per pattern when the batched call fails, keeping a failure with its pattern', async () => {
    const client = createClient();
    client.fieldCaps
      .mockRejectedValueOnce(responseError(500))
      .mockResolvedValueOnce(caps(['a'], { 'host.name': { keyword: capability() } }))
      .mockRejectedValueOnce(
        responseError(403, {
          error: { type: 'security_exception', reason: 'action is unauthorized' },
        })
      );
    const result = await resolveFieldAvailability(client, [
      { indexPattern: 'p1', indices: ['a'], fields: ['host.name'] },
      { indexPattern: 'p2', indices: ['b'], fields: ['host.name'] },
    ]);
    expect(client.fieldCaps).toHaveBeenCalledTimes(3);
    expect(client.fieldCaps.mock.calls.map(([request]) => request?.index)).toEqual([
      ['p1', 'p2'],
      ['p1'],
      ['p2'],
    ]);
    expect(result.get('p1')).toEqual({
      failed: false,
      mappedByIndex: new Map([['a', new Set(['host.name'])]]),
    });
    expect(result.get('p2')).toEqual({
      failed: true,
      status: 403,
      reason: 'field capabilities request failed: security_exception: action is unauthorized',
    });
  });
});

describe('planAvailability', () => {
  const plan = (indices: string[], fields: string[] = []): QueryPlan => ({
    index: 0,
    sourceIndex: 0,
    indexPattern: 'p',
    indices,
    queryTarget: 'pattern',
    attributes: fields.map((field) => ({ name: field, field })),
    engine: 'FROM',
  });

  it('is usable when one index maps every field of a tuple composition', () => {
    const mapped = new Map([
      ['a', new Set(['ns'])],
      ['b', new Set(['ns', 'name'])],
    ]);
    expect(planAvailability(plan(['a', 'b']), mapped, [['ns', 'name']])).toEqual({
      usable: true,
      unavailableFields: [],
    });
  });

  it('is unusable when the fields of a composition are only spread across indices', () => {
    const mapped = new Map([
      ['a', new Set(['host.id'])],
      ['b', new Set(['host.name'])],
    ]);
    expect(
      planAvailability(plan(['a', 'b']), mapped, [['host.id', 'host.name'], ['host.hostname']])
    ).toEqual({
      usable: false,
      reason:
        'no index behind "p" maps every field of an identity composition (host.id + host.name, host.hostname)',
      unavailableFields: [],
    });
  });

  it('is usable through a later ranked composition', () => {
    const mapped = new Map([['a', new Set(['host.name'])]]);
    expect(planAvailability(plan(['a']), mapped, [['host.id'], ['host.name']]).usable).toBe(true);
  });

  it('lists attribute fields mapped in none of the plan indices', () => {
    const mapped = new Map([
      ['a', new Set(['host.name', 'os.name'])],
      ['b', new Set(['host.name'])],
    ]);
    expect(
      planAvailability(plan(['a', 'b'], ['os.name', 'cloud.region']), mapped, [['host.name']])
    ).toEqual({ usable: true, unavailableFields: ['cloud.region'] });
  });
});

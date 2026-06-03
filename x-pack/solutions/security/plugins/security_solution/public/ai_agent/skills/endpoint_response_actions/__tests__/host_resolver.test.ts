/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveHost } from '../host_resolver';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../common/endpoint/constants';

jest.mock('../../../../common/lib/kibana');

import { KibanaServices } from '../../../../common/lib/kibana';

const getMockHttp = () =>
  (KibanaServices.get as jest.Mock)().http as jest.Mocked<{
    get: jest.Mock;
  }>;

const makeMetadataResponse = (
  entries: Array<{ hostname: string; agentId: string; isIsolated?: boolean }>
) => ({
  data: entries.map(({ hostname, agentId, isIsolated = false }) => ({
    metadata: {
      host: { hostname },
      agent: { id: agentId },
      Endpoint: { state: { isolation: isIsolated } },
    },
  })),
  total: entries.length,
  page: 0,
  pageSize: 10,
});

describe('resolveHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the Fleet metadata API with the correct route and kuery', async () => {
    getMockHttp().get.mockResolvedValueOnce(
      makeMetadataResponse([{ hostname: 'WIN-PROD-042', agentId: 'agent-001' }])
    );

    await resolveHost({ searchString: 'WIN-PROD-042' });

    expect(getMockHttp().get).toHaveBeenCalledWith(
      HOST_METADATA_LIST_ROUTE,
      expect.objectContaining({
        version: '2023-10-31',
        query: expect.objectContaining({
          kuery: expect.stringContaining('WIN-PROD-042'),
          page: 0,
          pageSize: 10,
        }),
      })
    );
  });

  it('returns a HostRef for an exact match', async () => {
    getMockHttp().get.mockResolvedValueOnce(
      makeMetadataResponse([{ hostname: 'WIN-PROD-042', agentId: 'agent-001' }])
    );

    const results = await resolveHost({ searchString: 'WIN-PROD-042' });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      hostName: 'WIN-PROD-042',
      agentId: 'agent-001',
      isIsolated: false,
    });
  });

  it('returns empty array when no hosts match', async () => {
    getMockHttp().get.mockResolvedValueOnce(makeMetadataResponse([]));

    const results = await resolveHost({ searchString: 'GHOST-HOST' });

    expect(results).toHaveLength(0);
  });

  it('returns empty array for blank search string without calling the API', async () => {
    const results = await resolveHost({ searchString: '   ' });

    expect(results).toHaveLength(0);
    expect(getMockHttp().get).not.toHaveBeenCalled();
  });

  it('returns empty array for empty string without calling the API', async () => {
    const results = await resolveHost({ searchString: '' });

    expect(results).toHaveLength(0);
    expect(getMockHttp().get).not.toHaveBeenCalled();
  });

  it('surfaces isIsolated: true when the host is currently isolated', async () => {
    getMockHttp().get.mockResolvedValueOnce(
      makeMetadataResponse([{ hostname: 'WIN-PROD-042', agentId: 'agent-001', isIsolated: true }])
    );

    const results = await resolveHost({ searchString: 'WIN-PROD-042' });

    expect(results).toHaveLength(1);
    expect(results[0].isIsolated).toBe(true);
  });

  it('returns multiple HostRefs when the search is ambiguous', async () => {
    getMockHttp().get.mockResolvedValueOnce(
      makeMetadataResponse([
        { hostname: 'WIN-PROD-042-A', agentId: 'agent-A' },
        { hostname: 'WIN-PROD-042-B', agentId: 'agent-B' },
        { hostname: 'WIN-PROD-042-C', agentId: 'agent-C' },
      ])
    );

    const results = await resolveHost({ searchString: 'WIN-PROD-042' });

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.agentId)).toEqual(['agent-A', 'agent-B', 'agent-C']);
  });

  it('uses a wildcard kuery that wraps the search string', async () => {
    getMockHttp().get.mockResolvedValueOnce(makeMetadataResponse([]));

    await resolveHost({ searchString: 'partial-name' });

    const [, options] = getMockHttp().get.mock.calls[0];
    expect(options.query.kuery).toMatch(/\*partial-name\*/);
  });
});

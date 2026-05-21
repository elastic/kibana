/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { extractEuidFromMlDataTool } from './extract_euid_from_ml_data';
import type { EntityType } from '../../../../../common/entity_analytics/types';

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: { getEuidFromObject: jest.fn() },
}));

const mockGetEuidFromObject = euid.getEuidFromObject as jest.Mock;

const getEuids = (result: {
  results: Array<{ data: { euids: Array<string | string[] | undefined> } }>;
}) => result.results[0].data.euids;

describe('extractEuidFromMlDataTool handler', () => {
  const tool = extractEuidFromMlDataTool() as unknown as { handler: Function };
  const callHandler = (anomalyRecords: unknown[]) => tool.handler({ anomalyRecords });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: delegate to the real implementation
    mockGetEuidFromObject.mockImplementation((entityType: string, doc: unknown) =>
      jest
        .requireActual<typeof import('@kbn/entity-store/common/euid_helpers')>(
          '@kbn/entity-store/common/euid_helpers'
        )
        .euid.getEuidFromObject(entityType as EntityType, doc)
    );
  });

  it('returns empty euids for an empty records array', async () => {
    const result = await callHandler([]);
    const euids = getEuids(result);
    expect(euids).toEqual([]);
    expect(euids).toHaveLength(0);
  });

  it('extracts EUID from a host record using host.name', async () => {
    const result = await callHandler([{ host: { name: 'server1' } }]);
    const euids = getEuids(result);
    expect(euids).toEqual(['host:server1']);
    expect(euids).toHaveLength(1);
  });

  it('prefers host.id over host.name when both are present', async () => {
    const result = await callHandler([{ host: { id: 'h1', name: 'server1' } }]);
    const euids = getEuids(result);
    expect(euids).toEqual(['host:h1']);
    expect(euids).toHaveLength(1);
  });

  it('extracts EUID from a user record using user.name', async () => {
    const result = await callHandler([
      { user: { name: 'alice' }, event: { kind: 'asset', module: 'okta' } },
    ]);
    const euids = getEuids(result);
    expect(euids).toHaveLength(1);
    expect(euids[0]).toBe('user:alice@okta');
  });

  it('returns undefined in the euids array for a record with an unsupported entity type (e.g. service)', async () => {
    const result = await callHandler([{ service: { name: 'my-svc' } }]);
    const euids = getEuids(result);
    expect(euids).toEqual([undefined]);
    expect(euids).toHaveLength(1);
  });

  it('returns undefined in the euids array for a record with no recognized identity fields', async () => {
    const result = await callHandler([{ record_score: 95, job_id: 'some-job' }]);
    const euids = getEuids(result);
    expect(euids).toEqual([undefined]);
    expect(euids).toHaveLength(1);
  });

  it('returns all extracted EUIDs if there are multiple matches from a record with both host.name and user.name', async () => {
    const result = await callHandler([
      {
        host: { name: 'server1' },
        user: { name: 'alice' },
        event: { kind: 'asset', module: 'okta' },
      },
    ]);
    const euids = getEuids(result);
    expect(euids).toEqual([['host:server1', 'user:alice@okta']]);
    expect(euids).toHaveLength(1);
  });

  it('collects EUIDs from multiple records with different entity types', async () => {
    const result = await callHandler([
      { host: { name: 'server1' } },
      { user: { name: 'alice' }, event: { kind: 'asset', module: 'okta' } },
    ]);
    const euids = getEuids(result);
    expect(euids).toHaveLength(2);
    expect(euids).toContain('host:server1');
    expect(euids).toContain('user:alice@okta');
  });

  it('returns one result per record (no deduplication across records)', async () => {
    const record = { host: { name: 'server1' } };
    const result = await callHandler([record, { service: { name: 'my-svc' } }, record, record]);
    expect(getEuids(result)).toEqual(['host:server1', undefined, 'host:server1', 'host:server1']);
  });

  it('returns an error result when getEuidFromObject throws', async () => {
    mockGetEuidFromObject.mockImplementation(() => {
      throw new Error('unexpected failure');
    });

    const result = await callHandler([{ host: { name: 'server1' } }]);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { error: string }).error).toContain(
      'Error calculating EUIDs from anomaly records'
    );
    expect((result.results[0].data as { error: string }).error).toContain('unexpected failure');
  });
});

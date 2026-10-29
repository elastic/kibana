/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { WorkerRoleDescriptor } from './role_pattern_coverage';
import { patternCovers, readWorkerRole, uncoveredPatterns } from './role_pattern_coverage';

const role = (overrides: Partial<WorkerRoleDescriptor> = {}): WorkerRoleDescriptor => ({
  indices: [{ names: ['logs-*', 'filebeat-*'], privileges: ['read'] }],
  remoteIndices: [],
  ...overrides,
});

const uncovered = (
  patterns: string[],
  roleDescriptor: WorkerRoleDescriptor = role(),
  isServerless = false
) => uncoveredPatterns({ role: roleDescriptor, patterns, isServerless });

describe('patternCovers', () => {
  it.each([
    ['logs-*', 'logs-endpoint.events.*', true],
    ['logs-*', 'custom-edr-*', false],
    ['*', 'anything-*', true],
    ['logs-*', 'log*', false],
    ['a*c*b', 'a*b', false],
    ['*s-*', 'logs-*', true],
    ['logs.*', 'logsX*', false],
  ])('patternCovers(%s, %s) is %s', (rolePattern, candidate, expected) => {
    expect(patternCovers(rolePattern, candidate)).toBe(expected);
  });
});

describe('uncoveredPatterns', () => {
  it('treats a stateful CCS pattern as covered by a remote_indices entry on clusters *', () => {
    const remote = role({
      remoteIndices: [{ names: ['logs-*'], privileges: ['read'], clusters: ['*'] }],
    });
    expect(uncovered(['infosec_zocalo:logs-*'], remote)).toEqual([]);
  });

  it('treats a wildcard cluster alias as covered by clusters *', () => {
    const remote = role({
      remoteIndices: [{ names: ['logs-*'], privileges: ['read'], clusters: ['*'] }],
    });
    expect(uncovered(['infosec_*:logs-*'], remote)).toEqual([]);
  });

  it('reports a stateful CCS pattern whose cluster the role does not name', () => {
    const remote = role({
      remoteIndices: [{ names: ['logs-*'], privileges: ['read'], clusters: ['other'] }],
    });
    expect(uncovered(['infosec_zocalo:logs-*'], remote)).toEqual(['infosec_zocalo:logs-*']);
  });

  it('reports a stateful CCS pattern when the role has no remote_indices', () => {
    expect(uncovered(['infosec_zocalo:logs-*'])).toEqual(['infosec_zocalo:logs-*']);
  });

  it.each(['linked:logs-*', '*:logs-*'])(
    'treats %s as covered by local logs-* on serverless',
    (p) => {
      expect(uncovered([p], role(), true)).toEqual([]);
    }
  );

  it('reports a serverless project pattern the local role does not cover', () => {
    expect(uncovered(['linked:custom-*'], role(), true)).toEqual(['linked:custom-*']);
  });

  it('reports a failure store selector', () => {
    expect(uncovered(['logs-*::failures'])).toEqual(['logs-*::failures']);
  });

  it.each(['-logs-x', '-remote:logs-x', 'remote:-logs-x'])('ignores the exclusion %s', (p) => {
    expect(uncovered([p])).toEqual([]);
  });

  it('reports a local pattern the role does not cover', () => {
    expect(uncovered(['logs-*', 'custom-edr-*'])).toEqual(['custom-edr-*']);
  });
});

describe('readWorkerRole', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const responseError = (statusCode: number) =>
    new errors.ResponseError({
      statusCode,
      body: {},
      headers: {},
      warnings: [],
      meta: {} as never,
    });

  it.each([403, 404])('returns undefined on a %s', async (statusCode) => {
    esClient.security.getRole.mockRejectedValue(responseError(statusCode));
    await expect(
      readWorkerRole({ esClient, roleName: 'alertzero_threat_hunt', isServerless: false })
    ).resolves.toBeUndefined();
  });

  it('rethrows a 500', async () => {
    esClient.security.getRole.mockRejectedValue(responseError(500));
    await expect(
      readWorkerRole({ esClient, roleName: 'alertzero_threat_hunt', isServerless: false })
    ).rejects.toThrow();
  });

  it('normalizes a getRole response with string names', async () => {
    esClient.security.getRole.mockResolvedValue({
      alertzero_threat_hunt: {
        indices: [{ names: 'logs-*', privileges: ['read'] }],
        remote_indices: [{ clusters: '*', names: 'logs-*', privileges: ['read'] }],
      },
    } as never);
    await expect(
      readWorkerRole({ esClient, roleName: 'alertzero_threat_hunt', isServerless: false })
    ).resolves.toEqual({
      indices: [{ names: ['logs-*'], privileges: ['read'] }],
      remoteIndices: [{ clusters: ['*'], names: ['logs-*'], privileges: ['read'] }],
    });
  });

  it('normalizes a queryRole response to the same descriptor', async () => {
    esClient.security.queryRole.mockResolvedValue({
      roles: [
        {
          name: '_alertzero_threat_hunt',
          indices: [{ names: 'logs-*', privileges: ['read'] }],
          remote_indices: [{ clusters: '*', names: 'logs-*', privileges: ['read'] }],
        },
      ],
    } as never);
    await expect(
      readWorkerRole({ esClient, roleName: '_alertzero_threat_hunt', isServerless: true })
    ).resolves.toEqual({
      indices: [{ names: ['logs-*'], privileges: ['read'] }],
      remoteIndices: [{ clusters: ['*'], names: ['logs-*'], privileges: ['read'] }],
    });
  });
});

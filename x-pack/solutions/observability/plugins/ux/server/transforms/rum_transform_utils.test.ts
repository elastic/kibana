/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RUM_SESSION_GROUP_FIELD } from '../../common/rum_sessions';
import {
  esStatusCode,
  installedRetentionMaxAge,
  installedSourceIndex,
  installedSourceLookbackGte,
  isEsAuthzDenied,
  isEsNotFound,
  isEsResourceExists,
  readRollupStatus,
  transformNeedsUpgrade,
  transformSourceWindowUpdate,
} from './rum_transform_utils';

const current = {
  transforms: [
    {
      source: {
        index: ['traces-*.otel-*'],
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: 'now-30d' } } },
              { exists: { field: RUM_SESSION_GROUP_FIELD } },
            ],
          },
        },
      },
      retention_policy: { time: { field: 'end_time', max_age: '30d' } },
    },
  ],
};

describe('transform source window helpers', () => {
  it('reads the installed lookback and retention', () => {
    expect(installedSourceIndex(current)).toEqual(['traces-*.otel-*']);
    expect(installedSourceLookbackGte(current)).toBe('now-30d');
    expect(installedRetentionMaxAge(current)).toBe('30d');
  });

  it('builds an _update body that includes source.index', () => {
    expect(
      transformSourceWindowUpdate({
        index: ['traces-*.otel-*'],
        lookbackGte: 'now-90d',
        retentionMaxAge: '93d',
      })
    ).toEqual({
      source: {
        index: ['traces-*.otel-*'],
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: 'now-90d' } } },
              { exists: { field: RUM_SESSION_GROUP_FIELD } },
            ],
          },
        },
      },
      retention_policy: { time: { field: 'end_time', max_age: '93d' } },
    });
  });

  it('does not throw when getTransform returned nothing', () => {
    expect(installedSourceLookbackGte(null)).toBeUndefined();
    expect(installedSourceLookbackGte(undefined)).toBeUndefined();
  });
});

const esError = (statusCode: number) =>
  Object.assign(new Error('security_exception'), { statusCode, meta: { statusCode } });

const asClient = ({
  getTransformStats,
  search,
}: {
  getTransformStats: jest.Mock;
  search?: jest.Mock;
}): ElasticsearchClient =>
  ({
    transform: { getTransformStats },
    search: search ?? jest.fn(),
  } as unknown as ElasticsearchClient);

describe('es status helpers', () => {
  it('reads statusCode from the Elasticsearch client error shape', () => {
    expect(esStatusCode({ meta: { statusCode: 403 } })).toBe(403);
    expect(isEsNotFound({ statusCode: 404 })).toBe(true);
    expect(isEsAuthzDenied({ meta: { statusCode: 403 } })).toBe(true);
    expect(isEsAuthzDenied({ statusCode: 401 })).toBe(true);
    expect(isEsAuthzDenied({ statusCode: 500 })).toBe(false);
  });

  it('treats a transform PUT over an existing id as a conflict', () => {
    // Transform PUT answers 400 resource_already_exists_exception rather than 409.
    expect(
      isEsResourceExists({
        statusCode: 400,
        meta: {
          statusCode: 400,
          body: {
            error: {
              type: 'resource_already_exists_exception',
              reason: 'Transform with id [ux-rum-sessions-3] already exists',
            },
          },
        },
      })
    ).toBe(true);
    expect(
      isEsResourceExists({ body: { error: { type: 'resource_already_exists_exception' } } })
    ).toBe(true);
    expect(isEsResourceExists({ statusCode: 409 })).toBe(true);
    expect(isEsResourceExists({ statusCode: 400 })).toBe(false);
    expect(isEsResourceExists(esError(403))).toBe(false);
  });
});

describe('transformNeedsUpgrade', () => {
  const withMeta = (_meta: unknown): ElasticsearchClient =>
    ({
      transform: { getTransform: jest.fn().mockResolvedValue({ transforms: [{ _meta }] }) },
    } as unknown as ElasticsearchClient);

  const args = { transformId: 'ux-rum-sessions-3', version: 3, spec: 6 };

  it('is true when the installed spec is behind the code', async () => {
    const client = withMeta({ managed_by: 'ux', version: 3, spec: 4 });
    expect(await transformNeedsUpgrade({ client, ...args })).toBe(true);
  });

  it('is true when the installed version is behind the code', async () => {
    const client = withMeta({ managed_by: 'ux', version: 2, spec: 6 });
    expect(await transformNeedsUpgrade({ client, ...args })).toBe(true);
  });

  it('is false when version and spec already match', async () => {
    const client = withMeta({ managed_by: 'ux', version: 3, spec: 6 });
    expect(await transformNeedsUpgrade({ client, ...args })).toBe(false);
  });

  it('is false when the transform is missing', async () => {
    const client = {
      transform: { getTransform: jest.fn().mockRejectedValue(esError(404)) },
    } as unknown as ElasticsearchClient;
    expect(await transformNeedsUpgrade({ client, ...args })).toBe(false);
  });
});

describe('readRollupStatus', () => {
  it('uses dest search when transform stats are forbidden', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const status = await readRollupStatus(
      asClient({
        getTransformStats: jest.fn().mockRejectedValue(esError(403)),
        search,
      }),
      { transformId: 'ux-rum-sessions-3', index: 'ux-rum-sessions-3', syncDelay: '5m' }
    );
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ux-rum-sessions-3', size: 0 })
    );
    expect(status.installed).toBe(true);
    expect(status.state).toBe('unknown');
    expect(status.watermark).toEqual(expect.any(String));
  });

  it('stays uninstalled when dest search is also forbidden', async () => {
    const status = await readRollupStatus(
      asClient({
        getTransformStats: jest.fn().mockRejectedValue(esError(403)),
        search: jest.fn().mockRejectedValue(esError(403)),
      }),
      { transformId: 'ux-rum-sessions-3', index: 'ux-rum-sessions-3' }
    );
    expect(status).toEqual({
      installed: false,
      state: 'unknown',
      watermark: null,
      transformId: 'ux-rum-sessions-3',
      index: 'ux-rum-sessions-3',
    });
  });

  it('does not throw when the transform is missing', async () => {
    const status = await readRollupStatus(
      asClient({
        getTransformStats: jest.fn().mockRejectedValue(esError(404)),
        search: jest.fn().mockRejectedValue(esError(404)),
      }),
      { transformId: 'ux-rum-sessions-3', index: 'ux-rum-sessions-3' }
    );
    expect(status.installed).toBe(false);
  });
});

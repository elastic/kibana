/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  esStatusCode,
  isEsAuthzDenied,
  isEsNotFound,
  isEsResourceExists,
  readRollupStatus,
  readTransformsRollupStatus,
} from './rum_transform_utils';

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
              reason: 'Transform with id [ux-rum-pages-daily-3] already exists',
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

describe('readRollupStatus', () => {
  it('uses dest search when transform stats are forbidden', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const status = await readRollupStatus(
      asClient({
        getTransformStats: jest.fn().mockRejectedValue(esError(403)),
        search,
      }),
      { transformId: 'ux-rum-pages-daily-3', index: 'ux-rum-pages-daily-3', syncDelay: '5m' }
    );
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ux-rum-pages-daily-3', size: 0 })
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
      { transformId: 'ux-rum-pages-daily-3', index: 'ux-rum-pages-daily-3' }
    );
    expect(status).toEqual({
      installed: false,
      state: 'unknown',
      watermark: null,
      transformId: 'ux-rum-pages-daily-3',
      index: 'ux-rum-pages-daily-3',
    });
  });

  it('does not throw when the transform is missing', async () => {
    const status = await readRollupStatus(
      asClient({
        getTransformStats: jest.fn().mockRejectedValue(esError(404)),
        search: jest.fn().mockRejectedValue(esError(404)),
      }),
      { transformId: 'ux-rum-pages-daily-3', index: 'ux-rum-pages-daily-3' }
    );
    expect(status.installed).toBe(false);
  });
});

describe('readTransformsRollupStatus', () => {
  const stats = (...rows: Array<{ state: string; checkpointMillis?: number }>) =>
    jest.fn().mockResolvedValue({
      transforms: rows.map(({ state, checkpointMillis }) => ({
        state,
        checkpointing: {
          last: checkpointMillis == null ? {} : { time_upper_bound_millis: checkpointMillis },
        },
      })),
    });
  const args = {
    transformId: 'digital-experience-sessions-*',
    index: 'digital-experience-sessions-*',
  };

  it('reads every partition with a wildcard and tolerates no match', async () => {
    const getTransformStats = stats({ state: 'started', checkpointMillis: 1000 });
    await readTransformsRollupStatus(asClient({ getTransformStats }), args);
    expect(getTransformStats).toHaveBeenCalledWith({
      transform_id: 'digital-experience-sessions-*',
      allow_no_match: true,
    });
  });

  it('reports the worst state and the oldest checkpoint across partitions', async () => {
    const status = await readTransformsRollupStatus(
      asClient({
        getTransformStats: stats(
          { state: 'started', checkpointMillis: Date.parse('2026-10-29T10:00:00.000Z') },
          { state: 'failed', checkpointMillis: Date.parse('2026-10-29T09:00:00.000Z') },
          { state: 'indexing', checkpointMillis: Date.parse('2026-10-29T11:00:00.000Z') }
        ),
      }),
      args
    );
    expect(status).toEqual({
      installed: true,
      state: 'failed',
      watermark: '2026-10-29T09:00:00.000Z',
      ...args,
    });
  });

  it('has no watermark until every partition has a checkpoint', async () => {
    const status = await readTransformsRollupStatus(
      asClient({
        getTransformStats: stats(
          { state: 'started', checkpointMillis: Date.parse('2026-10-29T10:00:00.000Z') },
          { state: 'started' }
        ),
      }),
      args
    );
    expect(status.installed).toBe(true);
    expect(status.watermark).toBeNull();
  });

  it('is not installed when no transform and no index matches', async () => {
    const status = await readTransformsRollupStatus(
      asClient({
        getTransformStats: jest.fn().mockResolvedValue({ transforms: [] }),
        search: jest.fn().mockRejectedValue(esError(404)),
      }),
      args
    );
    expect(status.installed).toBe(false);
  });

  it('infers installed from the dest search when stats are forbidden', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const status = await readTransformsRollupStatus(
      asClient({ getTransformStats: jest.fn().mockRejectedValue(esError(403)), search }),
      args
    );
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ allow_no_indices: false }));
    expect(status.installed).toBe(true);
    expect(status.state).toBe('unknown');
  });
});

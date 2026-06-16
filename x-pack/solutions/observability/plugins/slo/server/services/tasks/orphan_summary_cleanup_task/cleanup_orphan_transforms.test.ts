/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  elasticsearchClientMock,
  type ElasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { cleanupOrphanTransforms, parseSloTransformId } from './cleanup_orphan_transforms';

describe('parseSloTransformId', () => {
  it('should parse a rollup transform id', () => {
    expect(parseSloTransformId('slo-my-slo-id-1')).toEqual({ id: 'my-slo-id', revision: 1 });
  });

  it('should parse a summary transform id', () => {
    expect(parseSloTransformId('slo-summary-my-slo-id-2')).toEqual({
      id: 'my-slo-id',
      revision: 2,
    });
  });

  it('should parse a transform id with uuid-like slo id', () => {
    expect(parseSloTransformId('slo-a1b2c3d4-e5f6-7890-abcd-ef1234567890-3')).toEqual({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      revision: 3,
    });
  });

  it('should parse a summary transform id with uuid-like slo id', () => {
    expect(parseSloTransformId('slo-summary-a1b2c3d4-e5f6-7890-abcd-ef1234567890-1')).toEqual({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      revision: 1,
    });
  });

  it('should parse a transform id with a multi-digit revision', () => {
    expect(parseSloTransformId('slo-my-slo-id-42')).toEqual({ id: 'my-slo-id', revision: 42 });
  });

  it('should return null for an empty id', () => {
    expect(parseSloTransformId('')).toBeNull();
  });

  it('should return null for non-SLO transform ids', () => {
    expect(parseSloTransformId('some-other-transform')).toBeNull();
  });

  it('should return null for malformed ids without revision', () => {
    expect(parseSloTransformId('slo-')).toBeNull();
  });

  it('should return null for a bare summary prefix', () => {
    expect(parseSloTransformId('slo-summary-')).toBeNull();
  });

  it('should return null for a summary id without a revision', () => {
    expect(parseSloTransformId('slo-summary-my-slo-id')).toBeNull();
  });

  it('should return null for ids with non-numeric revision', () => {
    expect(parseSloTransformId('slo-my-slo-abc')).toBeNull();
  });

  it('should return null for ids with zero revision', () => {
    expect(parseSloTransformId('slo-my-slo-0')).toBeNull();
  });
});

describe('cleanupOrphanTransforms', () => {
  let esClient: ElasticsearchClientMock;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let logger: jest.Mocked<MockedLogger>;
  let abortController: AbortController;

  beforeEach(() => {
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
    abortController = new AbortController();
    jest.clearAllMocks();
  });

  it('should do nothing when no SLO transforms exist', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 0,
      transforms: [],
    } as any);

    const result = await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(soClient.find).not.toHaveBeenCalled();
    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
  });

  it('should not delete transforms that have matching SLO definitions', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 2,
      transforms: [
        { id: 'slo-my-slo-1', state: 'started' },
        { id: 'slo-summary-my-slo-1', state: 'started' },
      ],
    } as any);

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1', attributes: { id: 'my-slo', revision: 1, enabled: true } }],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
    expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
  });

  it('should delete orphaned transforms with no matching SLO definition', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 2,
      transforms: [
        { id: 'slo-orphan-slo-1', state: 'started' },
        { id: 'slo-summary-orphan-slo-1', state: 'started' },
      ],
    } as any);

    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(2);
    expect(esClient.transform.deleteTransform).toHaveBeenCalledWith(
      { transform_id: 'slo-orphan-slo-1', force: true },
      expect.objectContaining({ ignore: [404], signal: abortController.signal })
    );
    expect(esClient.transform.deleteTransform).toHaveBeenCalledWith(
      { transform_id: 'slo-summary-orphan-slo-1', force: true },
      expect.objectContaining({ ignore: [404], signal: abortController.signal })
    );
  });

  it('should delete transforms for old revisions', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 3,
      transforms: [
        { id: 'slo-my-slo-1', state: 'started' },
        { id: 'slo-my-slo-2', state: 'started' },
        { id: 'slo-summary-my-slo-2', state: 'started' },
      ],
    } as any);

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1', attributes: { id: 'my-slo', revision: 2, enabled: true } }],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(1);
    expect(esClient.transform.deleteTransform).toHaveBeenCalledWith(
      { transform_id: 'slo-my-slo-1', force: true },
      expect.objectContaining({ ignore: [404], signal: abortController.signal })
    );
  });

  it('should paginate through transforms', async () => {
    esClient.transform.getTransformStats
      .mockResolvedValueOnce({
        count: 2,
        transforms: [
          { id: 'slo-slo1-1', state: 'started' },
          { id: 'slo-summary-slo1-1', state: 'started' },
        ],
      } as any)
      .mockResolvedValueOnce({
        count: 1,
        transforms: [{ id: 'slo-slo2-1', state: 'started' }],
      } as any);

    soClient.find
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-1', attributes: { id: 'slo1', revision: 1, enabled: true } }],
        page: 1,
        per_page: 1,
      } as any)
      .mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 1,
      } as any);

    await cleanupOrphanTransforms(
      { pageSize: 2 },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.getTransformStats).toHaveBeenCalledTimes(2);
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(
      1,
      {
        transform_id: 'slo-*',
        from: 0,
        size: 2,
        allow_no_match: true,
        filter_path: 'count,transforms.id,transforms.state',
      },
      expect.objectContaining({ signal: abortController.signal })
    );
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(
      2,
      {
        transform_id: 'slo-*',
        from: 2,
        size: 2,
        allow_no_match: true,
        filter_path: 'count,transforms.id,transforms.state',
      },
      expect.objectContaining({ signal: abortController.signal })
    );

    expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(1);
    expect(esClient.transform.deleteTransform).toHaveBeenCalledWith(
      { transform_id: 'slo-slo2-1', force: true },
      expect.objectContaining({ ignore: [404], signal: abortController.signal })
    );
  });

  it('should handle RequestAbortedError gracefully and preserve the current cursor', async () => {
    esClient.transform.getTransformStats.mockRejectedValueOnce(
      new errors.RequestAbortedError('Aborted')
    );

    const result = await cleanupOrphanTransforms(
      { from: 200 },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: true, completed: false, nextState: { from: 200 } });
    expect(logger.debug).toHaveBeenCalledWith('Orphan transforms cleanup aborted');
  });

  it('should bail out when the signal is already aborted', async () => {
    abortController.abort();

    const result = await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: true, completed: false, nextState: { from: 0 } });
    expect(esClient.transform.getTransformStats).not.toHaveBeenCalled();
  });

  it('should stop after maxPages and persist the last cursor', async () => {
    esClient.transform.getTransformStats
      .mockResolvedValueOnce({
        count: 2,
        transforms: [
          { id: 'slo-slo1-1', state: 'started' },
          { id: 'slo-summary-slo1-1', state: 'started' },
        ],
      } as any)
      .mockResolvedValueOnce({
        count: 2,
        transforms: [
          { id: 'slo-slo2-1', state: 'started' },
          { id: 'slo-summary-slo2-1', state: 'started' },
        ],
      } as any);

    soClient.find
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-1', attributes: { id: 'slo1', revision: 1, enabled: true } }],
        page: 1,
        per_page: 1,
      } as any)
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-2', attributes: { id: 'slo2', revision: 1, enabled: true } }],
        page: 1,
        per_page: 1,
      } as any);

    const result = await cleanupOrphanTransforms(
      { pageSize: 2, maxPages: 2 },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: true, completed: false, nextState: { from: 4 } });
    expect(esClient.transform.getTransformStats).toHaveBeenCalledTimes(2);
    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
  });

  it('should ask ES to trim the _stats response to only the fields the cleanup reads', async () => {
    // Without filter_path, the response includes per-transform checkpointing,
    // stats, health and reason blobs (multi-KB at pageSize=100). The task only
    // reads id and state, so we trim server-side.
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 0,
      transforms: [],
    } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.getTransformStats).toHaveBeenCalledWith(
      expect.objectContaining({ filter_path: 'count,transforms.id,transforms.state' }),
      expect.any(Object)
    );
  });

  it('should advance the cursor by the number of survivors so deleted transforms do not shift the page', async () => {
    // Page 1 has two orphans (deleted) and one valid transform.
    // After the deletes, the valid transform shifts to position 0 of the live list,
    // so the next page must start at `from = 1` (3 fetched - 2 deleted), not `from = 3`.
    esClient.transform.getTransformStats
      .mockResolvedValueOnce({
        count: 3,
        transforms: [
          { id: 'slo-orphan1-1', state: 'started' },
          { id: 'slo-orphan2-1', state: 'started' },
          { id: 'slo-keep-1', state: 'started' },
        ],
      } as any)
      .mockResolvedValueOnce({
        count: 0,
        transforms: [],
      } as any);

    soClient.find
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-1', attributes: { id: 'keep', revision: 1, enabled: true } }],
        page: 1,
        per_page: 1,
      } as any)
      .mockResolvedValueOnce({ total: 0, saved_objects: [], page: 1, per_page: 1 } as any);

    await cleanupOrphanTransforms(
      { pageSize: 3 },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(2);
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(
      2,
      {
        transform_id: 'slo-*',
        from: 1,
        size: 3,
        allow_no_match: true,
        filter_path: 'count,transforms.id,transforms.state',
      },
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('should resume from the provided cursor', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 0,
      transforms: [],
    } as any);

    const result = await cleanupOrphanTransforms(
      { from: 50, pageSize: 100 },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.transform.getTransformStats).toHaveBeenCalledWith(
      {
        transform_id: 'slo-*',
        from: 50,
        size: 100,
        allow_no_match: true,
        filter_path: 'count,transforms.id,transforms.state',
      },
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('should rethrow non-abort errors', async () => {
    esClient.transform.getTransformStats.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      cleanupOrphanTransforms({}, { esClient, soClient: soClient as any, logger, abortController })
    ).rejects.toThrow('Network error');
  });

  it('should continue deleting even if one transform deletion fails', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 2,
      transforms: [
        { id: 'slo-orphan1-1', state: 'started' },
        { id: 'slo-orphan2-1', state: 'started' },
      ],
    } as any);

    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 2,
    } as any);

    esClient.transform.deleteTransform
      .mockRejectedValueOnce(new Error('Delete failed'))
      .mockResolvedValueOnce({ acknowledged: true } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete orphaned transform [slo-orphan1-1]')
    );
  });

  it('should skip non-SLO transforms that match the wildcard', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 3,
      transforms: [
        { id: 'slo-my-slo-1', state: 'started' },
        { id: 'slo-settings-something', state: 'started' },
        { id: 'slo-summary-my-slo-1', state: 'started' },
      ],
    } as any);

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1', attributes: { id: 'my-slo', revision: 1, enabled: true } }],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
    expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
  });

  it('should stop running transforms for disabled SLOs', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 2,
      transforms: [
        { id: 'slo-disabled-slo-1', state: 'started' },
        { id: 'slo-summary-disabled-slo-1', state: 'indexing' },
      ],
    } as any);

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [
        { id: 'so-1', attributes: { id: 'disabled-slo', revision: 1, enabled: false } },
      ],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
    expect(esClient.transform.stopTransform).toHaveBeenCalledTimes(2);
    expect(esClient.transform.stopTransform).toHaveBeenCalledWith(
      {
        transform_id: 'slo-disabled-slo-1',
        wait_for_completion: true,
        force: true,
        allow_no_match: true,
      },
      expect.objectContaining({ ignore: [404], signal: abortController.signal })
    );
    expect(esClient.transform.stopTransform).toHaveBeenCalledWith(
      {
        transform_id: 'slo-summary-disabled-slo-1',
        wait_for_completion: true,
        force: true,
        allow_no_match: true,
      },
      expect.objectContaining({ ignore: [404], signal: abortController.signal })
    );
  });

  it('should not stop transforms for disabled SLOs that are already stopped', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 2,
      transforms: [
        { id: 'slo-disabled-slo-1', state: 'stopped' },
        { id: 'slo-summary-disabled-slo-1', state: 'stopped' },
      ],
    } as any);

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [
        { id: 'so-1', attributes: { id: 'disabled-slo', revision: 1, enabled: false } },
      ],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
    expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
  });

  it('should continue stopping transforms even if one stop fails', async () => {
    esClient.transform.getTransformStats.mockResolvedValueOnce({
      count: 2,
      transforms: [
        { id: 'slo-disabled-slo-1', state: 'started' },
        { id: 'slo-summary-disabled-slo-1', state: 'started' },
      ],
    } as any);

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [
        { id: 'so-1', attributes: { id: 'disabled-slo', revision: 1, enabled: false } },
      ],
      page: 1,
      per_page: 1,
    } as any);

    esClient.transform.stopTransform
      .mockRejectedValueOnce(new Error('Stop failed'))
      .mockResolvedValueOnce({ acknowledged: true } as any);

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.transform.stopTransform).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to stop transform [slo-disabled-slo-1]')
    );
  });

  // The tests below guard against production outages where the task could
  // delete transforms that are still owned by a live SLO definition.
  describe('production safety', () => {
    it('should NOT delete any transforms when the SLO definition lookup fails', async () => {
      esClient.transform.getTransformStats.mockResolvedValueOnce({
        count: 2,
        transforms: [
          { id: 'slo-my-slo-id-1', state: 'started' },
          { id: 'slo-summary-my-slo-id-1', state: 'started' },
        ],
      } as any);

      soClient.find.mockRejectedValueOnce(new Error('saved objects index unavailable'));

      await expect(
        cleanupOrphanTransforms(
          {},
          { esClient, soClient: soClient as any, logger, abortController }
        )
      ).rejects.toThrow('saved objects index unavailable');

      expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
      expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
    });

    it('should NOT delete transforms for SLOs whose ids contain numeric segments', async () => {
      // Guards against the parsing regex stripping a trailing "-<digits>" from
      // an SLO id like `my-slo-id-42` and then incorrectly classifying the
      // transform as orphan because the lookup key would not match.
      esClient.transform.getTransformStats.mockResolvedValueOnce({
        count: 2,
        transforms: [
          { id: 'slo-my-slo-id-42-1', state: 'started' },
          { id: 'slo-summary-my-slo-id-42-1', state: 'started' },
        ],
      } as any);

      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [
          { id: 'so-1', attributes: { id: 'my-slo-id-42', revision: 1, enabled: true } },
        ],
        page: 1,
        per_page: 1,
      } as any);

      await cleanupOrphanTransforms(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `slo.attributes.id:(my-slo-id-42)`,
        })
      );
      expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
      expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
    });

    it('should NOT touch transforms for ENABLED SLOs regardless of transform state', async () => {
      esClient.transform.getTransformStats.mockResolvedValueOnce({
        count: 4,
        transforms: [
          { id: 'slo-enabled-slo-1', state: 'started' },
          { id: 'slo-summary-enabled-slo-1', state: 'indexing' },
          { id: 'slo-other-slo-1', state: 'stopped' },
          { id: 'slo-summary-other-slo-1', state: 'failed' },
        ],
      } as any);

      soClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          { id: 'so-1', attributes: { id: 'enabled-slo', revision: 1, enabled: true } },
          { id: 'so-2', attributes: { id: 'other-slo', revision: 1, enabled: true } },
        ],
        page: 1,
        per_page: 2,
      } as any);

      await cleanupOrphanTransforms(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
      expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
    });

    it('should only delete the OLD revision when a single SLO has transforms at multiple revisions', async () => {
      // Reset/upgrade flow: the SLO has been bumped from revision 1 to 2. The
      // old-revision transforms must be deleted, but the current ones must
      // stay running.
      esClient.transform.getTransformStats.mockResolvedValueOnce({
        count: 4,
        transforms: [
          { id: 'slo-my-slo-1', state: 'started' },
          { id: 'slo-summary-my-slo-1', state: 'started' },
          { id: 'slo-my-slo-2', state: 'started' },
          { id: 'slo-summary-my-slo-2', state: 'started' },
        ],
      } as any);

      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-1', attributes: { id: 'my-slo', revision: 2, enabled: true } }],
        page: 1,
        per_page: 1,
      } as any);

      await cleanupOrphanTransforms(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(2);
      const deletedIds = esClient.transform.deleteTransform.mock.calls.map(
        (call) => (call[0] as { transform_id: string }).transform_id
      );
      expect(deletedIds.sort()).toEqual(['slo-my-slo-1', 'slo-summary-my-slo-1']);
      expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
    });

    it('should query saved objects across ALL spaces so SLOs in non-default spaces are not deleted', async () => {
      // A regression that drops `namespaces: [ALL_SPACES_ID]` would cause
      // every transform owned by SLOs in custom spaces to be classified as
      // orphan and deleted on the next task run.
      esClient.transform.getTransformStats.mockResolvedValueOnce({
        count: 1,
        transforms: [{ id: 'slo-my-slo-1', state: 'started' }],
      } as any);

      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 1,
      } as any);

      await cleanupOrphanTransforms(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(soClient.find).toHaveBeenCalledWith(expect.objectContaining({ namespaces: ['*'] }));
    });

    it('should not delete transforms whose ids match the wildcard but are not parseable SLO transforms', async () => {
      // Even if a transform name happens to start with `slo-`, we must not
      // attempt to delete it unless the parser confidently extracts an SLO
      // id and a revision >= 1. This guards the SO lookup against being
      // skipped on a page of only-unparseable transforms (which would cause
      // the loop to never call `find` and therefore never delete anything).
      esClient.transform.getTransformStats
        .mockResolvedValueOnce({
          count: 2,
          transforms: [{ id: 'slo-some-config' }, { id: 'slo-anything-else' }],
        } as any)
        .mockResolvedValueOnce({ count: 0, transforms: [] } as any);

      await cleanupOrphanTransforms(
        { pageSize: 2 },
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(soClient.find).not.toHaveBeenCalled();
      expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
      expect(esClient.transform.stopTransform).not.toHaveBeenCalled();
    });

    it('should not delete transforms with revision 0 (would not parse, so cannot be matched against any SLO)', async () => {
      esClient.transform.getTransformStats.mockResolvedValueOnce({
        count: 2,
        transforms: [
          { id: 'slo-my-slo-0', state: 'started' },
          { id: 'slo-summary-my-slo-0', state: 'started' },
        ],
      } as any);

      await cleanupOrphanTransforms(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(soClient.find).not.toHaveBeenCalled();
      expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
    });

    it('should not stop transforms that are in a transient non-running state for a disabled SLO', async () => {
      // States like `stopping` / `failed` are not "running"; trying to stop a
      // stopping/failed transform is wasteful and could cause noisy warnings
      // or unexpected side-effects.
      esClient.transform.getTransformStats.mockResolvedValueOnce({
        count: 3,
        transforms: [
          { id: 'slo-disabled-slo-1', state: 'stopping' },
          { id: 'slo-summary-disabled-slo-1', state: 'failed' },
          { id: 'slo-other-disabled-1', state: 'started' },
        ],
      } as any);

      soClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          { id: 'so-1', attributes: { id: 'disabled-slo', revision: 1, enabled: false } },
          { id: 'so-2', attributes: { id: 'other-disabled', revision: 1, enabled: false } },
        ],
        page: 1,
        per_page: 2,
      } as any);

      await cleanupOrphanTransforms(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.transform.deleteTransform).not.toHaveBeenCalled();
      expect(esClient.transform.stopTransform).toHaveBeenCalledTimes(1);
      expect(esClient.transform.stopTransform).toHaveBeenCalledWith(
        expect.objectContaining({ transform_id: 'slo-other-disabled-1' }),
        expect.any(Object)
      );
    });
  });
});

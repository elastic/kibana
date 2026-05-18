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

  it('should return null for non-SLO transform ids', () => {
    expect(parseSloTransformId('some-other-transform')).toBeNull();
  });

  it('should return null for malformed ids without revision', () => {
    expect(parseSloTransformId('slo-')).toBeNull();
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

    await cleanupOrphanTransforms(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

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
      { transform_id: 'slo-*', from: 0, size: 2, allow_no_match: true },
      expect.objectContaining({ signal: abortController.signal })
    );
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(
      2,
      { transform_id: 'slo-*', from: 2, size: 2, allow_no_match: true },
      expect.objectContaining({ signal: abortController.signal })
    );

    expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(1);
    expect(esClient.transform.deleteTransform).toHaveBeenCalledWith(
      { transform_id: 'slo-slo2-1', force: true },
      expect.objectContaining({ ignore: [404], signal: abortController.signal })
    );
  });

  it('should handle RequestAbortedError gracefully', async () => {
    esClient.transform.getTransformStats.mockRejectedValueOnce(
      new errors.RequestAbortedError('Aborted')
    );

    await expect(
      cleanupOrphanTransforms({}, { esClient, soClient: soClient as any, logger, abortController })
    ).resolves.toBeUndefined();

    expect(logger.debug).toHaveBeenCalledWith('Orphan transforms cleanup aborted');
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
});

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
import { cleanupOrphanPipelines, parseSloPipelineId } from './cleanup_orphan_pipelines';

const sliPipeline = (id: string, revision: number) =>
  `.slo-observability.sli.pipeline-${id}-${revision}`;
const summaryPipeline = (id: string, revision: number) =>
  `.slo-observability.summary.pipeline-${id}-${revision}`;

const mockGetPipelineResponse = (pipelineIds: string[]) =>
  Object.fromEntries(pipelineIds.map((id) => [id, { processors: [] }])) as any;

describe('parseSloPipelineId', () => {
  it('parses an SLI pipeline id', () => {
    expect(parseSloPipelineId(sliPipeline('my-slo-id', 1))).toEqual({
      id: 'my-slo-id',
      revision: 1,
    });
  });

  it('parses a summary pipeline id', () => {
    expect(parseSloPipelineId(summaryPipeline('my-slo-id', 2))).toEqual({
      id: 'my-slo-id',
      revision: 2,
    });
  });

  it('parses an SLI pipeline id with a uuid-like slo id', () => {
    expect(parseSloPipelineId(sliPipeline('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3))).toEqual({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      revision: 3,
    });
  });

  it('parses a summary pipeline id with a uuid-like slo id', () => {
    expect(parseSloPipelineId(summaryPipeline('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1))).toEqual({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      revision: 1,
    });
  });

  it('parses a pipeline id with a multi-digit revision', () => {
    expect(parseSloPipelineId(sliPipeline('my-slo-id', 42))).toEqual({
      id: 'my-slo-id',
      revision: 42,
    });
  });

  it('returns null for an empty id', () => {
    expect(parseSloPipelineId('')).toBeNull();
  });

  it('returns null for non-SLO pipeline ids', () => {
    expect(parseSloPipelineId('.kibana-system-pipeline')).toBeNull();
  });

  it('returns null for custom user pipelines that match the wildcard fetch but not the SLO regex', () => {
    expect(parseSloPipelineId('.slo-my-slo-id@custom')).toBeNull();
    expect(parseSloPipelineId('.slo-summary-my-slo-id@custom')).toBeNull();
  });

  it('returns null for pipelines whose middle segment is not sli or summary', () => {
    expect(parseSloPipelineId('.slo-observability.health.pipeline-my-slo-id-1')).toBeNull();
    expect(parseSloPipelineId('.slo-observability.foo.pipeline-my-slo-id-1')).toBeNull();
  });

  it('returns null when the revision is missing', () => {
    expect(parseSloPipelineId('.slo-observability.sli.pipeline-my-slo-id')).toBeNull();
  });

  it('returns null when the revision is non-numeric', () => {
    expect(parseSloPipelineId('.slo-observability.sli.pipeline-my-slo-id-abc')).toBeNull();
  });

  it('returns null when the revision is zero', () => {
    expect(parseSloPipelineId(sliPipeline('my-slo-id', 0))).toBeNull();
  });
});

describe('cleanupOrphanPipelines', () => {
  let esClient: ElasticsearchClientMock;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let logger: jest.Mocked<MockedLogger>;
  let abortController: AbortController;
  let signal: AbortSignal;

  beforeEach(() => {
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
    abortController = new AbortController();
    signal = abortController.signal;
    jest.clearAllMocks();
  });

  it('does nothing when no SLO ingest pipelines exist', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(mockGetPipelineResponse([]));

    const result = await cleanupOrphanPipelines(
      {},
      { esClient, soClient: soClient as any, logger, signal }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.ingest.getPipeline).toHaveBeenCalledWith(
      { id: '.slo-observability.*.pipeline-*', summary: true },
      expect.objectContaining({ ignore: [404], signal })
    );
    expect(soClient.find).not.toHaveBeenCalled();
    expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
  });

  it('does not delete pipelines whose SLO has a matching definition at the same revision', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(
      mockGetPipelineResponse([sliPipeline('my-slo', 1), summaryPipeline('my-slo', 1)])
    );

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1', attributes: { id: 'my-slo', revision: 1, enabled: true } }],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

    expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
  });

  it('issues a single wildcard delete per (sloId, revision) orphan rather than one per pipeline', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(
      mockGetPipelineResponse([sliPipeline('orphan-slo', 1), summaryPipeline('orphan-slo', 1)])
    );

    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

    expect(esClient.ingest.deletePipeline).toHaveBeenCalledTimes(1);
    expect(esClient.ingest.deletePipeline).toHaveBeenCalledWith(
      { id: '.slo-observability.*.pipeline-orphan-slo-1' },
      expect.objectContaining({ ignore: [404], signal })
    );
  });

  it('cleans up single-sided orphans (only SLI or only summary present)', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(
      mockGetPipelineResponse([
        sliPipeline('orphan-sli-only', 1),
        summaryPipeline('orphan-summary-only', 1),
      ])
    );

    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 2,
    } as any);

    await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

    expect(esClient.ingest.deletePipeline).toHaveBeenCalledTimes(2);
    const deletedIds = esClient.ingest.deletePipeline.mock.calls.map(
      (call) => (call[0] as { id: string }).id
    );
    expect(deletedIds.sort()).toEqual([
      '.slo-observability.*.pipeline-orphan-sli-only-1',
      '.slo-observability.*.pipeline-orphan-summary-only-1',
    ]);
  });

  it('deletes pipelines for old revisions but keeps the current revision', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(
      mockGetPipelineResponse([
        sliPipeline('my-slo', 1),
        summaryPipeline('my-slo', 1),
        sliPipeline('my-slo', 2),
        summaryPipeline('my-slo', 2),
      ])
    );

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1', attributes: { id: 'my-slo', revision: 2, enabled: true } }],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

    expect(esClient.ingest.deletePipeline).toHaveBeenCalledTimes(1);
    expect(esClient.ingest.deletePipeline).toHaveBeenCalledWith(
      { id: '.slo-observability.*.pipeline-my-slo-1' },
      expect.objectContaining({ ignore: [404], signal })
    );
  });

  it('paginates through pipelines and persists a resume cursor when maxPages is reached', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(
      mockGetPipelineResponse([
        sliPipeline('slo1', 1),
        sliPipeline('slo2', 1),
        sliPipeline('slo3', 1),
        sliPipeline('slo4', 1),
      ])
    );

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

    const result = await cleanupOrphanPipelines(
      { pageSize: 1, maxPages: 2 },
      { esClient, soClient: soClient as any, logger, signal }
    );

    expect(result).toEqual({
      aborted: true,
      completed: false,
      nextState: { after: sliPipeline('slo2', 1) },
    });
    expect(esClient.ingest.getPipeline).toHaveBeenCalledTimes(1);
    expect(soClient.find).toHaveBeenCalledTimes(2);
    expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
  });

  it('resumes from the provided cursor and skips pipelines at or before it', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(
      mockGetPipelineResponse([
        sliPipeline('slo1', 1),
        sliPipeline('slo2', 1),
        sliPipeline('slo3', 1),
      ])
    );

    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanPipelines(
      { after: sliPipeline('slo2', 1) },
      { esClient, soClient: soClient as any, logger, signal }
    );

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ filter: 'slo.attributes.id:(slo3)' })
    );
    expect(esClient.ingest.deletePipeline).toHaveBeenCalledTimes(1);
    expect(esClient.ingest.deletePipeline).toHaveBeenCalledWith(
      { id: '.slo-observability.*.pipeline-slo3-1' },
      expect.objectContaining({ ignore: [404], signal })
    );
  });

  it('handles RequestAbortedError gracefully and preserves the current cursor', async () => {
    esClient.ingest.getPipeline.mockRejectedValueOnce(new errors.RequestAbortedError('Aborted'));

    const result = await cleanupOrphanPipelines(
      { after: '.slo-observability.sli.pipeline-prev-1' },
      { esClient, soClient: soClient as any, logger, signal }
    );

    expect(result).toEqual({
      aborted: true,
      completed: false,
      nextState: { after: '.slo-observability.sli.pipeline-prev-1' },
    });
    expect(logger.debug).toHaveBeenCalledWith('Orphan pipelines cleanup aborted');
  });

  it('bails out when the signal is already aborted', async () => {
    abortController.abort();

    const result = await cleanupOrphanPipelines(
      {},
      { esClient, soClient: soClient as any, logger, signal }
    );

    expect(result).toEqual({ aborted: true, completed: false, nextState: { after: undefined } });
    expect(esClient.ingest.getPipeline).not.toHaveBeenCalled();
  });

  it('rethrows non-abort errors', async () => {
    esClient.ingest.getPipeline.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal })
    ).rejects.toThrow('Network error');
  });

  it('continues deleting even if one pipeline deletion fails', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(
      mockGetPipelineResponse([sliPipeline('orphan1', 1), sliPipeline('orphan2', 1)])
    );

    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 2,
    } as any);

    esClient.ingest.deletePipeline
      .mockRejectedValueOnce(new Error('Delete failed'))
      .mockResolvedValueOnce({ acknowledged: true } as any);

    await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

    expect(esClient.ingest.deletePipeline).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete orphan SLO pipeline')
    );
  });

  it('skips unparseable pipelines that happen to match the wildcard pattern', async () => {
    esClient.ingest.getPipeline.mockResolvedValueOnce(
      mockGetPipelineResponse([
        sliPipeline('my-slo', 1),
        '.slo-observability.foo.pipeline-bar-1',
        summaryPipeline('my-slo', 1),
      ])
    );

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1', attributes: { id: 'my-slo', revision: 1, enabled: true } }],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

    expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
  });

  // The tests below guard against production outages where the task could
  // delete pipelines that are still owned by a live SLO definition.
  describe('production safety', () => {
    it('does NOT delete any pipelines when the SLO definition lookup fails', async () => {
      esClient.ingest.getPipeline.mockResolvedValueOnce(
        mockGetPipelineResponse([sliPipeline('my-slo-id', 1), summaryPipeline('my-slo-id', 1)])
      );

      soClient.find.mockRejectedValueOnce(new Error('saved objects index unavailable'));

      await expect(
        cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal })
      ).rejects.toThrow('saved objects index unavailable');

      expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
    });

    it('does NOT delete pipelines for SLOs whose ids contain numeric segments', async () => {
      // Guards against a regex that strips a trailing "-<digits>" from an SLO
      // id like `my-slo-id-42` and then incorrectly classifies the pipeline
      // as orphan because the lookup key would not match.
      esClient.ingest.getPipeline.mockResolvedValueOnce(
        mockGetPipelineResponse([
          sliPipeline('my-slo-id-42', 1),
          summaryPipeline('my-slo-id-42', 1),
        ])
      );

      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [
          { id: 'so-1', attributes: { id: 'my-slo-id-42', revision: 1, enabled: true } },
        ],
        page: 1,
        per_page: 1,
      } as any);

      await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'slo.attributes.id:(my-slo-id-42)' })
      );
      expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
    });

    it('queries saved objects across ALL spaces so SLOs in non-default spaces are not deleted', async () => {
      esClient.ingest.getPipeline.mockResolvedValueOnce(
        mockGetPipelineResponse([sliPipeline('my-slo', 1)])
      );

      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 1,
      } as any);

      await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

      expect(soClient.find).toHaveBeenCalledWith(expect.objectContaining({ namespaces: ['*'] }));
    });

    it('does not delete pipelines whose ids match the wildcard but are not parseable SLO pipelines', async () => {
      // If a page contains only unparseable pipelines, the SO lookup must be
      // skipped (otherwise it would be called with an empty id list and we
      // could not classify orphans correctly).
      esClient.ingest.getPipeline.mockResolvedValueOnce(
        mockGetPipelineResponse([
          '.slo-observability.foo.pipeline-bar-1',
          '.slo-observability.health.pipeline-bar-1',
        ])
      );

      await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

      expect(soClient.find).not.toHaveBeenCalled();
      expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
    });

    it('does not delete pipelines with revision 0 (would not parse, so cannot be matched against any SLO)', async () => {
      esClient.ingest.getPipeline.mockResolvedValueOnce(
        mockGetPipelineResponse([sliPipeline('my-slo', 0), summaryPipeline('my-slo', 0)])
      );

      await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

      expect(soClient.find).not.toHaveBeenCalled();
      expect(esClient.ingest.deletePipeline).not.toHaveBeenCalled();
    });

    it('uses a wildcard DELETE that includes the revision so a newer revision is not affected', async () => {
      // The wildcard pattern is `.slo-observability.*.pipeline-{id}-{rev}`,
      // not `.slo-observability.*.pipeline-{id}-*`. This guards against a
      // regression that would broaden the delete and wipe a freshly created
      // pipeline for a revision-bumped SLO mid-cleanup.
      esClient.ingest.getPipeline.mockResolvedValueOnce(
        mockGetPipelineResponse([sliPipeline('my-slo', 1)])
      );

      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 1,
      } as any);

      await cleanupOrphanPipelines({}, { esClient, soClient: soClient as any, logger, signal });

      expect(esClient.ingest.deletePipeline).toHaveBeenCalledWith(
        { id: '.slo-observability.*.pipeline-my-slo-1' },
        expect.objectContaining({ ignore: [404], signal })
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestPipeline,
  IngestProcessorContainer,
} from '@elastic/elasticsearch/lib/api/types';
import {
  elasticsearchClientMock,
  type ElasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { getSLIIndexNamePrefix, getSLIRoutingPipelineName } from '../../../../common/constants';
import {
  migrateSliPipelines,
  patchSliPipeline,
  selectMigrationCandidate,
} from './migrate_sli_pipelines';

let mockResourcesVersion = 3.6;
let mockRoutedVersions: number[] = [3.6];
jest.mock('../../../../common/constants', () => {
  const actual = jest.requireActual('../../../../common/constants');
  return {
    ...actual,
    get SLO_RESOURCES_VERSION() {
      return mockResourcesVersion;
    },
    get SLI_ROUTED_VERSIONS() {
      return mockRoutedVersions;
    },
  };
});

const NOW = new Date('2026-11-17T10:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const ID_PROCESSOR: IngestProcessorContainer = {
  set: { field: '_id', value: '{{{_id}}}-my-slo-1' },
};
const CUSTOM_PROCESSOR: IngestProcessorContainer = {
  pipeline: { ignore_missing_pipeline: true, ignore_failure: true, name: 'slo-my-slo@custom' },
};

const sliPipeline = (
  version: number,
  prefix: string = getSLIIndexNamePrefix(version)
): IngestPipeline => ({
  description: 'Ingest pipeline for SLO rollup data',
  processors: [
    ID_PROCESSOR,
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: prefix,
        date_rounding: 'd',
        date_formats: ['UNIX_MS', 'ISO8601', "yyyy-MM-dd'T'HH:mm:ss.SSSXX"],
      },
    },
    CUSTOM_PROCESSOR,
  ],
  _meta: { description: 'Ingest pipeline for SLO rollup data', version, managed: true },
  created_date_millis: 1763000000000,
  modified_date_millis: 1763000000000,
});

const routedSliPipeline = (version: number): IngestPipeline => ({
  processors: [
    ID_PROCESSOR,
    { pipeline: { name: getSLIRoutingPipelineName(version) } },
    CUSTOM_PROCESSOR,
  ],
  _meta: { version, managed: true },
});

const routingPipeline = (version: number, templateVersion: number): IngestPipeline => ({
  processors: [],
  _meta: {
    version,
    template_version: templateVersion,
    routing: { segments: [{ from: null, rounding: 'M' }] },
  },
});

const pipelineId = (name: string) => `.slo-observability.sli.pipeline-${name}-1`;

const setupStore = (esClient: ElasticsearchClientMock, initial: Record<string, IngestPipeline>) => {
  const store: Record<string, IngestPipeline> = { ...initial };
  esClient.ingest.getPipeline.mockImplementation(async (params) => {
    const id = params?.id ?? '';
    if (id === '.slo-observability.sli.pipeline-*') {
      return Object.fromEntries(
        Object.entries(store).filter(([key]) => key.startsWith('.slo-observability.sli.pipeline-'))
      );
    }
    const pipeline = store[id];
    return pipeline ? { [id]: pipeline } : {};
  });
  esClient.ingest.putPipeline.mockImplementation(async ({ id, ...body }) => {
    store[id] = body;
    return { acknowledged: true };
  });
  return store;
};

const putPipelineIds = (esClient: ElasticsearchClientMock) =>
  esClient.ingest.putPipeline.mock.calls.map(([params]) => params.id);

describe('selectMigrationCandidate', () => {
  it.each([
    [
      'selects a routed version pipeline with its own date_index_name prefix',
      sliPipeline(3.6),
      { type: 'candidate', version: 3.6, processorIndex: 1 },
    ],
    [
      'reports a prefix that does not match the pipeline version',
      sliPipeline(3.6, '.custom-index-'),
      { type: 'prefix_mismatch', version: 3.6, prefix: '.custom-index-' },
    ],
    ['skips versions that are not routed', sliPipeline(3.5), { type: 'not_applicable' }],
    [
      'skips pipelines already calling the routing pipeline',
      routedSliPipeline(3.6),
      { type: 'not_applicable' },
    ],
    [
      'skips pipelines without a version',
      { ...sliPipeline(3.6), _meta: {} },
      { type: 'not_applicable' },
    ],
  ])('%s', (_, pipeline, expected) => {
    expect(selectMigrationCandidate(pipeline)).toEqual(expected);
  });
});

describe('patchSliPipeline', () => {
  it('replaces the date_index_name processor in place, strips system managed fields and keeps everything else', () => {
    const pipeline: IngestPipeline = {
      ...sliPipeline(3.6),
      created_date: '2026-11-17',
      modified_date: '2026-11-17',
    };

    const patched = patchSliPipeline(pipelineId('my-slo'), pipeline, {
      version: 3.6,
      processorIndex: 1,
    });

    expect(patched).toEqual({
      id: pipelineId('my-slo'),
      description: pipeline.description,
      processors: [
        ID_PROCESSOR,
        {
          pipeline: {
            description: 'Route to the time-based SLI index',
            name: '.slo-observability.sli.routing-v3.6',
          },
        },
        CUSTOM_PROCESSOR,
      ],
      _meta: pipeline._meta,
    });
  });
});

describe('migrateSliPipelines', () => {
  let esClient: ElasticsearchClientMock;
  let logger: MockedLogger;
  let abortController: AbortController;

  const dependencies = () => ({ esClient, logger, signal: abortController.signal, now: NOW });

  beforeEach(() => {
    mockResourcesVersion = 3.6;
    mockRoutedVersions = [3.6];
    esClient = elasticsearchClientMock.createElasticsearchClient();
    logger = loggerMock.create();
    abortController = new AbortController();
  });

  it('migrates v3.6 pipelines and skips the others', async () => {
    const store = setupStore(esClient, {
      [getSLIRoutingPipelineName(3.6)]: routingPipeline(3.6, 3.6),
      [pipelineId('daily')]: sliPipeline(3.6),
      [pipelineId('monthly-v35')]: sliPipeline(3.5),
      [pipelineId('routed')]: routedSliPipeline(3.6),
      [pipelineId('hand-edited')]: sliPipeline(3.6, '.custom-index-'),
    });

    const result = await migrateSliPipelines({}, dependencies());

    expect(putPipelineIds(esClient)).toEqual([pipelineId('daily')]);
    expect(store[pipelineId('daily')].processors?.[1]?.pipeline?.name).toBe(
      '.slo-observability.sli.routing-v3.6'
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(pipelineId('hand-edited')));
    expect(result).toEqual({ lastFullScanAt: NOW.getTime(), lastScanCandidates: 0 });
  });

  it('migrates an unmigrated v3.6 pipeline to routing-v3.6 after a version bump', async () => {
    mockResourcesVersion = 3.7;
    mockRoutedVersions = [3.6, 3.7];
    const store = setupStore(esClient, {
      [getSLIRoutingPipelineName(3.6)]: routingPipeline(3.6, 3.7),
      [getSLIRoutingPipelineName(3.7)]: routingPipeline(3.7, 3.7),
      [pipelineId('old')]: sliPipeline(3.6),
      [pipelineId('new')]: sliPipeline(3.7),
    });

    await migrateSliPipelines({}, dependencies());

    expect(putPipelineIds(esClient)).toEqual([pipelineId('new'), pipelineId('old')]);
    expect(store[pipelineId('old')].processors?.[1]?.pipeline?.name).toBe(
      '.slo-observability.sli.routing-v3.6'
    );
    expect(store[pipelineId('new')].processors?.[1]?.pipeline?.name).toBe(
      '.slo-observability.sli.routing-v3.7'
    );
  });

  it.each([
    ['missing', undefined],
    ['stale', routingPipeline(3.6, 3.5)],
  ])(
    'does not migrate a version whose routing pipeline is %s, and still migrates the others',
    async (_, routing) => {
      mockResourcesVersion = 3.7;
      mockRoutedVersions = [3.6, 3.7];
      setupStore(esClient, {
        ...(routing ? { [getSLIRoutingPipelineName(3.6)]: routing } : {}),
        [getSLIRoutingPipelineName(3.7)]: routingPipeline(3.7, 3.7),
        [pipelineId('old-a')]: sliPipeline(3.6),
        [pipelineId('old-b')]: sliPipeline(3.6),
        [pipelineId('new')]: sliPipeline(3.7),
      });

      const result = await migrateSliPipelines({}, dependencies());

      expect(putPipelineIds(esClient)).toEqual([pipelineId('new')]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('.slo-observability.sli.routing-v3.6')
      );
      expect(result).toEqual({ lastFullScanAt: NOW.getTime(), lastScanCandidates: 2 });
    }
  );

  it('logs and counts per-pipeline failures without failing the run', async () => {
    setupStore(esClient, {
      [getSLIRoutingPipelineName(3.6)]: routingPipeline(3.6, 3.6),
      [pipelineId('a')]: sliPipeline(3.6),
      [pipelineId('b')]: sliPipeline(3.6),
    });
    esClient.ingest.putPipeline.mockRejectedValueOnce(new Error('boom'));

    const result = await migrateSliPipelines({}, dependencies());

    expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(result).toEqual({ lastFullScanAt: NOW.getTime(), lastScanCandidates: 1 });
  });

  it.each([
    ['skips the scan', DAY_MS - 1, false],
    ['scans again', DAY_MS, true],
  ])('%s %pms after a full scan without candidates', async (_, elapsedMs, scanned) => {
    setupStore(esClient, {});
    const state = { lastFullScanAt: NOW.getTime() - elapsedMs, lastScanCandidates: 0 };

    const result = await migrateSliPipelines(state, dependencies());

    expect(esClient.ingest.getPipeline).toHaveBeenCalledTimes(scanned ? 1 : 0);
    expect(result).toEqual(
      scanned ? { lastFullScanAt: NOW.getTime(), lastScanCandidates: 0 } : state
    );
  });

  it('resumes from the cursor when the maximum number of pages is reached', async () => {
    setupStore(esClient, {
      [getSLIRoutingPipelineName(3.6)]: routingPipeline(3.6, 3.6),
      [pipelineId('a')]: sliPipeline(3.6),
      [pipelineId('b')]: sliPipeline(3.6),
    });

    const first = await migrateSliPipelines({}, dependencies(), { pageSize: 1, maxPages: 1 });
    expect(first).toEqual({ cursor: pipelineId('a') });
    expect(putPipelineIds(esClient)).toEqual([pipelineId('a')]);

    const second = await migrateSliPipelines(first, dependencies(), { pageSize: 1, maxPages: 1 });
    expect(putPipelineIds(esClient)).toEqual([pipelineId('a'), pipelineId('b')]);
    expect(second).toEqual({ lastFullScanAt: NOW.getTime(), lastScanCandidates: 0 });
  });

  it('returns the cursor when aborted mid-run', async () => {
    setupStore(esClient, {
      [getSLIRoutingPipelineName(3.6)]: routingPipeline(3.6, 3.6),
      [pipelineId('a')]: sliPipeline(3.6),
      [pipelineId('b')]: sliPipeline(3.6),
    });
    esClient.ingest.putPipeline
      .mockResolvedValueOnce({ acknowledged: true })
      .mockImplementationOnce(async () => {
        abortController.abort();
        throw new Error('aborted');
      });

    const result = await migrateSliPipelines({}, dependencies(), { pageSize: 1 });

    expect(result).toEqual({ cursor: pipelineId('a') });
  });
});

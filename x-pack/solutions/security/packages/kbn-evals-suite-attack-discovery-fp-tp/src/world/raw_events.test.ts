/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  FP_TP_RAW_EVENT_INDEX_PREFIX,
  FP_TP_RAW_EVENT_INDEX_TEMPLATE,
  FP_TP_RAW_EVENT_INGEST_PIPELINE,
} from './constants';
import {
  FP_TP_RAW_EVENT_TEMPLATE_PRIORITY,
  FP_TP_RAW_EVENT_TOTAL_FIELDS_LIMIT,
  ensureFpTpRawEventIndices,
  ensureFpTpRawEventPipeline,
  ensureFpTpRawEventStore,
  ensureFpTpRawEventTemplate,
  rawEventIndexNames,
  rawEventIngestPipeline,
} from './raw_events';

const resourceAlreadyExists = () =>
  Object.assign(new Error('already exists'), {
    statusCode: 400,
    meta: { body: { error: { type: 'resource_already_exists_exception' } } },
  });

describe('rawEventIndexNames', () => {
  it('de-duplicates the indices the events target, in first-seen order', () => {
    expect(
      rawEventIndexNames([
        { index: 'logs-endpoint.events.fp-tp-process' },
        { index: 'logs-endpoint.events.fp-tp-network' },
        { index: 'logs-endpoint.events.fp-tp-process' },
      ])
    ).toEqual(['logs-endpoint.events.fp-tp-process', 'logs-endpoint.events.fp-tp-network']);
  });
});

describe('ensureFpTpRawEventTemplate', () => {
  it('installs a data-stream template above the generic logs template', async () => {
    const putIndexTemplate = jest.fn().mockResolvedValue({ acknowledged: true });

    await ensureFpTpRawEventTemplate({ indices: { putIndexTemplate } } as unknown as EsClient);

    expect(putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: FP_TP_RAW_EVENT_INDEX_TEMPLATE,
        index_patterns: [`${FP_TP_RAW_EVENT_INDEX_PREFIX}*`],
        priority: FP_TP_RAW_EVENT_TEMPLATE_PRIORITY,
        composed_of: ['logs@mappings', 'ecs@mappings'],
        data_stream: {},
        template: expect.objectContaining({
          settings: { 'index.mapping.total_fields.limit': FP_TP_RAW_EVENT_TOTAL_FIELDS_LIMIT },
        }),
      })
    );
    expect(FP_TP_RAW_EVENT_TEMPLATE_PRIORITY).toBeGreaterThan(100);
  });

  it('maps the fields the workflow queries explicitly', async () => {
    const putIndexTemplate = jest.fn().mockResolvedValue({ acknowledged: true });

    await ensureFpTpRawEventTemplate({ indices: { putIndexTemplate } } as unknown as EsClient);

    const [params] = putIndexTemplate.mock.calls[0];
    expect(params.template.mappings.properties.host.properties.id).toEqual({ type: 'keyword' });
    expect(params.template.mappings.properties.event.properties.ingested).toEqual({ type: 'date' });
    expect(params.template.mappings.properties.labels.properties.ad_portable_seed).toEqual({
      type: 'keyword',
    });
  });
});

describe('ensureFpTpRawEventIndices', () => {
  it('creates each distinct stream once', async () => {
    const createDataStream = jest.fn().mockResolvedValue({ acknowledged: true });

    await ensureFpTpRawEventIndices({ indices: { createDataStream } } as unknown as EsClient, [
      'logs-endpoint.events.fp-tp-process',
      'logs-endpoint.events.fp-tp-process',
      'logs-endpoint.events.fp-tp-network',
    ]);

    expect(createDataStream.mock.calls.map(([params]) => params.name)).toEqual([
      'logs-endpoint.events.fp-tp-process',
      'logs-endpoint.events.fp-tp-network',
    ]);
  });

  it('tolerates an already-existing stream', async () => {
    const createDataStream = jest.fn().mockRejectedValue(resourceAlreadyExists());

    await expect(
      ensureFpTpRawEventIndices({ indices: { createDataStream } } as unknown as EsClient, [
        'logs-endpoint.events.fp-tp-process',
      ])
    ).resolves.toBeUndefined();
  });

  it('rethrows a failure that is not an already-exists race', async () => {
    const createDataStream = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('forbidden'), { statusCode: 403 }));

    await expect(
      ensureFpTpRawEventIndices({ indices: { createDataStream } } as unknown as EsClient, [
        'logs-endpoint.events.fp-tp-process',
      ])
    ).rejects.toThrow('forbidden');
  });
});

describe('rawEventIngestPipeline', () => {
  it('normalizes @timestamp and stamps event.ingested from ingest time', () => {
    const pipeline = rawEventIngestPipeline() as {
      processors: Array<Record<string, Record<string, unknown>>>;
    };
    expect(pipeline.processors[0].date).toMatchObject({
      field: '@timestamp',
      formats: ['ISO8601'],
    });
    expect(pipeline.processors[1].set).toEqual({
      field: 'event.ingested',
      value: '{{{_ingest.timestamp}}}',
    });
  });

  it('is installed under the shared pipeline id', async () => {
    const putPipeline = jest.fn().mockResolvedValue({ acknowledged: true });

    await ensureFpTpRawEventPipeline({ ingest: { putPipeline } } as unknown as EsClient);

    expect(putPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ id: FP_TP_RAW_EVENT_INGEST_PIPELINE })
    );
  });

  it('sends the processors as top-level request params, not under a legacy body', async () => {
    const putPipeline = jest.fn().mockResolvedValue({ acknowledged: true });

    await ensureFpTpRawEventPipeline({ ingest: { putPipeline } } as unknown as EsClient);

    const [request] = putPipeline.mock.calls[0];
    expect(request).not.toHaveProperty('body');
    expect(request.processors).toEqual(rawEventIngestPipeline().processors);
  });
});

describe('ensureFpTpRawEventStore', () => {
  it('installs the template, the streams, and the pipeline, and returns the pipeline id', async () => {
    const putIndexTemplate = jest.fn().mockResolvedValue({ acknowledged: true });
    const createDataStream = jest.fn().mockResolvedValue({ acknowledged: true });
    const putPipeline = jest.fn().mockResolvedValue({ acknowledged: true });

    const pipelineId = await ensureFpTpRawEventStore(
      {
        indices: { putIndexTemplate, createDataStream },
        ingest: { putPipeline },
      } as unknown as EsClient,
      ['logs-endpoint.events.fp-tp-process']
    );

    expect(pipelineId).toBe(FP_TP_RAW_EVENT_INGEST_PIPELINE);
    expect(putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(createDataStream).toHaveBeenCalledTimes(1);
    expect(putPipeline).toHaveBeenCalledTimes(1);
  });
});

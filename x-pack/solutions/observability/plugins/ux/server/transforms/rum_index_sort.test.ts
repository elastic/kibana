/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  RUM_OTEL_INDEX_SORT_FIELD,
  RUM_OTEL_INDEX_SORT_ORDER,
  RUM_OTEL_LOGS_CUSTOM_TEMPLATE,
  RUM_OTEL_SESSION_ID_KEYWORD,
  RUM_OTEL_TRACES_CUSTOM_TEMPLATE,
  RUM_REPLAY_COMPONENT_TEMPLATE_NAME,
  RUM_REPLAY_INDEX_TEMPLATE_NAME,
} from '../../common/rum_sessions';
import {
  composedAttributesFromSimulate,
  ensureOtelSessionSort,
  ensureReplayIndexTemplate,
  hasOtelSessionIdMapping,
  hasReplayComponentMappings,
  isReplayOtelStream,
  matchesIndexSort,
  mergeOtelCustomMappings,
  mergeReplayComponentMappings,
  mergeSortSettings,
  otelSourceStreams,
  parseIndexSort,
  rumReplayComponentMappings,
  withSessionIdAttributes,
  writeIndexName,
} from './rum_index_sort';

const SAMPLE_SORT_FIELD = ['start_time', 'session.id'] as const;
const SAMPLE_SORT_ORDER = ['desc', 'asc'] as const;

const destSettings = (field: string[], order: string[]) => ({
  'sample-index': {
    settings: {
      'index.sort.field': field,
      'index.sort.order': order,
    },
  },
});

const otelWriteSettings = (field: string[], order: string[]) => ({
  '.ds-traces-generic.otel-default-000004': {
    settings: {
      'index.sort.field': field,
      'index.sort.order': order,
    },
  },
});

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('parseIndexSort / matchesIndexSort', () => {
  it('reads flat getSettings and nested component settings', () => {
    expect(
      parseIndexSort({
        'sample-index': {
          settings: {
            'index.sort.field': [...SAMPLE_SORT_FIELD],
            'index.sort.order': [...SAMPLE_SORT_ORDER],
          },
        },
      })
    ).toEqual({
      field: ['start_time', 'session.id'],
      order: ['desc', 'asc'],
    });
    expect(
      parseIndexSort({
        index: {
          sort: { field: 'start_time', order: 'desc' },
        },
      })
    ).toEqual({ field: ['start_time'], order: ['desc'] });
  });

  it('matches an index against a target sort', () => {
    expect(
      matchesIndexSort(
        destSettings([...SAMPLE_SORT_FIELD], [...SAMPLE_SORT_ORDER]),
        SAMPLE_SORT_FIELD,
        SAMPLE_SORT_ORDER
      )
    ).toBe(true);
    expect(
      matchesIndexSort(destSettings(['start_time'], ['desc']), SAMPLE_SORT_FIELD, SAMPLE_SORT_ORDER)
    ).toBe(false);
    expect(
      matchesIndexSort(
        otelWriteSettings([...RUM_OTEL_INDEX_SORT_FIELD], [...RUM_OTEL_INDEX_SORT_ORDER]),
        RUM_OTEL_INDEX_SORT_FIELD,
        RUM_OTEL_INDEX_SORT_ORDER
      )
    ).toBe(true);
  });
});

describe('OTel mapping helpers', () => {
  it('skips replay streams and uses the last backing index as write', () => {
    expect(isReplayOtelStream('logs-rum.replay-default')).toBe(true);
    expect(isReplayOtelStream('logs-generic.otel-default')).toBe(false);
    expect(
      otelSourceStreams([
        { name: 'traces-generic.otel-default' },
        { name: 'logs-rum.replay-default' },
      ])
    ).toEqual([{ name: 'traces-generic.otel-default' }]);
    expect(
      writeIndexName({
        indices: [{ index_name: '.ds-a-000001' }, { index_name: '.ds-a-000004' }],
      })
    ).toBe('.ds-a-000004');
  });

  it('clones composed attributes and keeps customer mappings', () => {
    const attributes = {
      type: 'object',
      properties: {
        'k8s.cluster.name': { type: 'keyword' },
        'service.name': { type: 'keyword' },
      },
    };
    expect(withSessionIdAttributes(attributes)).toEqual({
      type: 'object',
      properties: {
        'k8s.cluster.name': { type: 'keyword' },
        'service.name': { type: 'keyword' },
        'session.id': { ...RUM_OTEL_SESSION_ID_KEYWORD },
      },
    });
    expect(
      mergeOtelCustomMappings({
        existing: {
          properties: {
            custom_marker: { type: 'keyword' },
          },
        },
        attributes,
      }).properties
    ).toEqual({
      custom_marker: { type: 'keyword' },
      resource: {
        properties: {
          attributes: {
            type: 'object',
            properties: {
              'k8s.cluster.name': { type: 'keyword' },
              'service.name': { type: 'keyword' },
              'session.id': { ...RUM_OTEL_SESSION_ID_KEYWORD },
            },
          },
        },
      },
    });
  });

  it('does not overwrite an existing session.id mapping', () => {
    const existing = { type: 'keyword', ignore_above: 256 };
    expect(
      withSessionIdAttributes({
        properties: { 'session.id': existing },
      }).properties
    ).toEqual({ 'session.id': existing });
  });

  it('merges sort onto existing settings without adding shards', () => {
    expect(
      mergeSortSettings(
        {
          index: {
            number_of_shards: '3',
            sort: { field: ['host.name'], order: ['asc'] },
          },
        },
        RUM_OTEL_INDEX_SORT_FIELD,
        RUM_OTEL_INDEX_SORT_ORDER
      )
    ).toEqual({
      index: {
        number_of_shards: '3',
        sort: {
          field: [...RUM_OTEL_INDEX_SORT_FIELD],
          order: [...RUM_OTEL_INDEX_SORT_ORDER],
        },
      },
    });
  });

  it('reads composed attributes from simulate and detects session.id', () => {
    expect(composedAttributesFromSimulate({})).toBeUndefined();
    expect(
      composedAttributesFromSimulate({
        template: {
          mappings: {
            properties: {
              resource: { properties: { attributes: { properties: { 'service.name': {} } } } },
            },
          },
        },
      })
    ).toEqual({ properties: { 'service.name': {} } });
    expect(
      hasOtelSessionIdMapping({
        properties: {
          resource: {
            properties: {
              attributes: { properties: { 'session.id': { type: 'keyword' } } },
            },
          },
        },
      })
    ).toBe(true);
    expect(hasOtelSessionIdMapping({ properties: {} })).toBe(false);
  });
});

describe('ensureOtelSessionSort', () => {
  const attributes = {
    properties: {
      'k8s.cluster.name': { type: 'keyword' },
      'service.name': { type: 'keyword' },
    },
  };

  const mockClient = ({
    existingCustom,
    writeSort,
    streams,
    putError,
  }: {
    existingCustom?: {
      settings?: Record<string, unknown>;
      mappings?: Record<string, unknown>;
    };
    writeSort: { field: string[]; order: string[] };
    streams: Array<{ name: string; indices: Array<{ index_name: string }> }>;
    putError?: Error;
  }) => {
    const getComponentTemplate = jest.fn().mockImplementation(async () => {
      if (!existingCustom) {
        const error = new Error('not found') as Error & { statusCode: number };
        error.statusCode = 404;
        throw error;
      }
      return {
        component_templates: [
          {
            component_template: {
              template: {
                settings: existingCustom.settings,
                mappings: existingCustom.mappings,
              },
            },
          },
        ],
      };
    });
    const putComponentTemplate = putError
      ? jest.fn().mockRejectedValue(putError)
      : jest.fn().mockResolvedValue({});
    return {
      cluster: { getComponentTemplate, putComponentTemplate },
      indices: {
        simulateIndexTemplate: jest.fn().mockResolvedValue({
          template: {
            mappings: {
              properties: { resource: { properties: { attributes } } },
            },
          },
        }),
        getDataStream: jest.fn().mockResolvedValue({ data_streams: streams }),
        getSettings: jest.fn().mockResolvedValue({
          [writeSort.field[0] === 'host.name' ? 'unsorted' : '.ds-write']: {
            settings: {
              'index.sort.field': writeSort.field,
              'index.sort.order': writeSort.order,
            },
          },
        }),
        rollover: jest.fn().mockResolvedValue({}),
      },
    } as unknown as ElasticsearchClient;
  };

  it('puts @custom and skips rollover when the write index is already sorted', async () => {
    const client = mockClient({
      writeSort: {
        field: [...RUM_OTEL_INDEX_SORT_FIELD],
        order: [...RUM_OTEL_INDEX_SORT_ORDER],
      },
      streams: [
        {
          name: 'traces-generic.otel-default',
          indices: [{ index_name: '.ds-traces-generic.otel-default-000004' }],
        },
      ],
    });

    await ensureOtelSessionSort({ client, logger });

    expect(client.cluster.putComponentTemplate).toHaveBeenCalled();
    expect(
      (client.cluster.putComponentTemplate as jest.Mock).mock.calls.some(
        ([body]: Array<{ template?: { settings?: { index?: { number_of_shards?: unknown } } } }>) =>
          body.template?.settings?.index?.number_of_shards != null
      )
    ).toBe(false);
    expect(client.indices.rollover).not.toHaveBeenCalled();
  });

  it('skips putting @custom when sort and session.id are already present', async () => {
    const client = mockClient({
      existingCustom: {
        settings: {
          index: {
            sort: {
              field: [...RUM_OTEL_INDEX_SORT_FIELD],
              order: [...RUM_OTEL_INDEX_SORT_ORDER],
            },
          },
        },
        mappings: {
          properties: {
            attributes: { subobjects: false },
            resource: {
              properties: {
                attributes: {
                  subobjects: false,
                  properties: { 'session.id': { type: 'keyword' } },
                },
              },
            },
          },
        },
      },
      writeSort: {
        field: [...RUM_OTEL_INDEX_SORT_FIELD],
        order: [...RUM_OTEL_INDEX_SORT_ORDER],
      },
      streams: [
        {
          name: 'traces-generic.otel-default',
          indices: [{ index_name: '.ds-traces-generic.otel-default-000004' }],
        },
      ],
    });

    await ensureOtelSessionSort({ client, logger });
    expect(client.cluster.putComponentTemplate).not.toHaveBeenCalled();
  });

  it('rollovers an unsorted write index and skips replay', async () => {
    const client = mockClient({
      writeSort: { field: ['host.name', '@timestamp'], order: ['asc', 'desc'] },
      streams: [
        {
          name: 'traces-generic.otel-default',
          indices: [{ index_name: '.ds-traces-generic.otel-default-000001' }],
        },
        {
          name: 'logs-rum.replay-default',
          indices: [{ index_name: '.ds-logs-rum.replay-default-000001' }],
        },
      ],
    });

    await ensureOtelSessionSort({ client, logger });

    expect(client.indices.rollover).toHaveBeenCalledTimes(1);
    expect(client.indices.rollover).toHaveBeenCalledWith({
      alias: 'traces-generic.otel-default',
    });
  });

  it('clones Fleet attributes and maps session.id on greenfield clusters when no OTel streams exist yet', async () => {
    const client = mockClient({
      writeSort: { field: [], order: [] },
      streams: [],
    });
    (client.indices.getDataStream as jest.Mock).mockRejectedValue(
      Object.assign(new Error('no streams'), { statusCode: 404 })
    );

    await ensureOtelSessionSort({ client, logger });
    expect(client.indices.simulateIndexTemplate).toHaveBeenCalled();
    const tracesPut = (client.cluster.putComponentTemplate as jest.Mock).mock.calls.find(
      ([body]: Array<{ name: string }>) => body.name === RUM_OTEL_TRACES_CUSTOM_TEMPLATE
    )?.[0];
    expect(
      tracesPut?.template?.mappings?.properties?.resource?.properties?.attributes?.properties
    ).toEqual({
      'k8s.cluster.name': { type: 'keyword' },
      'service.name': { type: 'keyword' },
      'session.id': { ...RUM_OTEL_SESSION_ID_KEYWORD },
    });
    expect(client.indices.rollover).not.toHaveBeenCalled();
  });

  it('repairs a settings-only @custom that is missing the session.id mapping', async () => {
    const client = mockClient({
      existingCustom: {
        settings: {
          index: {
            sort: {
              field: [...RUM_OTEL_INDEX_SORT_FIELD],
              order: [...RUM_OTEL_INDEX_SORT_ORDER],
            },
          },
        },
      },
      writeSort: { field: [], order: [] },
      streams: [],
    });

    await ensureOtelSessionSort({ client, logger });
    expect(client.indices.simulateIndexTemplate).toHaveBeenCalled();
    const tracesPut = (client.cluster.putComponentTemplate as jest.Mock).mock.calls.find(
      ([body]: Array<{ name: string }>) => body.name === RUM_OTEL_TRACES_CUSTOM_TEMPLATE
    )?.[0];
    expect(
      tracesPut?.template?.mappings?.properties?.resource?.properties?.attributes?.properties?.[
        'session.id'
      ]
    ).toEqual({ ...RUM_OTEL_SESSION_ID_KEYWORD });
  });

  it('skips putting @custom sort when simulate fails and session.id is not mapped', async () => {
    const client = mockClient({
      writeSort: { field: [], order: [] },
      streams: [],
    });
    (client.indices.simulateIndexTemplate as jest.Mock).mockRejectedValue(
      new Error('no built-in otel template')
    );

    await ensureOtelSessionSort({ client, logger });
    expect(
      (client.cluster.putComponentTemplate as jest.Mock).mock.calls.some(
        ([body]: Array<{ name: string }>) =>
          body.name === RUM_OTEL_TRACES_CUSTOM_TEMPLATE ||
          body.name === RUM_OTEL_LOGS_CUSTOM_TEMPLATE
      )
    ).toBe(false);
  });

  it('does not throw when putting @custom fails', async () => {
    const client = mockClient({
      writeSort: { field: [], order: [] },
      streams: [],
      putError: new Error('no fleet templates'),
    });

    await expect(ensureOtelSessionSort({ client, logger })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it('clones Fleet attributes onto @custom when OTel streams already exist', async () => {
    const client = mockClient({
      writeSort: {
        field: [...RUM_OTEL_INDEX_SORT_FIELD],
        order: [...RUM_OTEL_INDEX_SORT_ORDER],
      },
      streams: [
        {
          name: 'traces-generic.otel-default',
          indices: [{ index_name: '.ds-traces-generic.otel-default-000004' }],
        },
      ],
    });

    await ensureOtelSessionSort({ client, logger });

    const lastPut = (client.cluster.putComponentTemplate as jest.Mock).mock.calls.find(
      ([body]: Array<{ name: string; template?: { mappings?: unknown } }>) =>
        body.name === RUM_OTEL_TRACES_CUSTOM_TEMPLATE && body.template?.mappings != null
    )?.[0];
    expect(lastPut.template.mappings.properties.resource.properties.attributes.properties).toEqual({
      'k8s.cluster.name': { type: 'keyword' },
      'service.name': { type: 'keyword' },
      'session.id': { ...RUM_OTEL_SESSION_ID_KEYWORD },
    });
    expect(lastPut.name).toBe(RUM_OTEL_TRACES_CUSTOM_TEMPLATE);
    expect(
      (client.cluster.putComponentTemplate as jest.Mock).mock.calls.some(
        ([body]: Array<{ name: string }>) => body.name === RUM_OTEL_LOGS_CUSTOM_TEMPLATE
      )
    ).toBe(true);
  });
});

describe('ensureReplayIndexTemplate', () => {
  it('puts rum-replay-mappings and rum-replay when missing and preserves additive fields', async () => {
    expect(hasReplayComponentMappings({})).toBe(false);
    expect(hasReplayComponentMappings(rumReplayComponentMappings)).toBe(true);
    const merged = mergeReplayComponentMappings({
      properties: {
        attributes: {
          properties: {
            'user.key': { type: 'keyword' },
          },
        },
      },
    });
    expect(hasReplayComponentMappings(merged)).toBe(true);
    expect(
      (merged.properties as { attributes: { properties: Record<string, unknown> } }).attributes
        .properties['user.key']
    ).toEqual({ type: 'keyword' });

    const notFound = Object.assign(new Error('not found'), { statusCode: 404 });
    const putComponentTemplate = jest.fn().mockResolvedValue({});
    const putIndexTemplate = jest.fn().mockResolvedValue({});
    const client = {
      cluster: {
        getComponentTemplate: jest.fn().mockRejectedValue(notFound),
        putComponentTemplate,
      },
      indices: {
        getIndexTemplate: jest.fn().mockRejectedValue(notFound),
        putIndexTemplate,
      },
    } as unknown as ElasticsearchClient;

    await ensureReplayIndexTemplate({ client, logger });

    expect(putComponentTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: RUM_REPLAY_COMPONENT_TEMPLATE_NAME,
      })
    );
    expect(putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: RUM_REPLAY_INDEX_TEMPLATE_NAME,
        composed_of: [RUM_REPLAY_COMPONENT_TEMPLATE_NAME],
      })
    );
  });
});

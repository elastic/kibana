/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

const INGEST_PIPELINE_PREFIX = 'testing-ingest-pipeline';
const DS_PREFIX = 'testing-datastream';
const ILM_PREFIX = 'testing-ilm';

export const indexRandomData = async (es: Client, dsName: string, ingestPipeline: string) => {
  await es.index({
    index: dsName,
    pipeline: ingestPipeline,
    document: {
      '@timestamp': new Date(),
      key: `value-${Date.now()}`,
    },
  });
};

export const randomDatastream = async (
  es: Client,
  opts: { policyName?: string; defaultPipeline?: string; finalPipeline?: string } = {}
): Promise<string> => {
  const name = `${DS_PREFIX}-${Date.now()}`;

  const indexTemplateBody: IndicesPutIndexTemplateRequest = {
    name: DS_PREFIX,
    index_patterns: [`${DS_PREFIX}-*`],
    data_stream: {},
    template: {
      settings: {
        index: {
          mode: 'standard',
          mapping: {
            source: {
              mode: 'stored',
            },
          },
        },
      },
    },
  };

  if (opts.policyName && indexTemplateBody.template?.settings !== undefined) {
    indexTemplateBody.template.settings.index = {
      ...indexTemplateBody.template.settings.index,
      lifecycle: {
        name: opts.policyName,
      },
    };
  }

  if (opts.defaultPipeline && indexTemplateBody.template?.settings !== undefined) {
    indexTemplateBody.template.settings.index = {
      ...indexTemplateBody.template.settings.index,
      default_pipeline: opts.defaultPipeline,
    };
  }

  if (opts.finalPipeline && indexTemplateBody.template?.settings !== undefined) {
    indexTemplateBody.template.settings.index = {
      ...indexTemplateBody.template.settings.index,
      final_pipeline: opts.finalPipeline,
    };
  }

  await es.indices.putIndexTemplate(indexTemplateBody);

  await es.indices.createDataStream({ name });

  return name;
};

export const randomIngestPipeline = async (es: Client): Promise<string> => {
  const id = `${INGEST_PIPELINE_PREFIX}-${Date.now()}`;

  await es.ingest.putPipeline({
    id,
    processors: [
      {
        set: {
          field: `message-${performance.now()}`,
          value: `changed-${Date.now()}`,
        },
      },
    ],
  });

  return id;
};

export const randomIlmPolicy = async (es: Client): Promise<string> => {
  const name = `${ILM_PREFIX}-${Date.now()}`;

  const policy = {
    phases: {
      hot: {
        actions: {
          rollover: {
            max_size: '50gb',
            max_age: '30d',
          },
        },
      },
      warm: {
        min_age: '30d',
        actions: {
          forcemerge: {
            max_num_segments: 1,
          },
          shrink: {
            number_of_shards: 1,
          },
          allocate: {
            number_of_replicas: 1,
          },
        },
      },
      delete: {
        min_age: '90d',
        actions: {
          delete: {},
        },
      },
    },
  };

  await es.ilm.putLifecycle({ name, policy });

  return name;
};

export const ensureBackingIndices = async (dsName: string, count: number, es: Client) => {
  const stats = await es.indices.dataStreamsStats({ name: dsName });
  if (stats.data_streams.length !== 1) {
    throw new Error('Data stream not found');
  }
  const current = stats.data_streams[0].backing_indices;

  if (current < count) {
    for (let i = current; i < count; i++) {
      await es.indices.rollover({ alias: dsName });
    }
  } else if (current > count) {
    throw new Error('Cannot reduce the number of backing indices');
  }
};

export const cleanupDatastreams = async (es: Client) => {
  await es.indices.deleteDataStream({ name: `${DS_PREFIX}*` });
};

export const cleanupIngestPipelines = async (es: Client) => {
  es.ingest.deletePipeline({ id: `${INGEST_PIPELINE_PREFIX}*` });
};

export const cleanupPolicies = async (es: Client) => {
  const policies = await es.ilm.getLifecycle({ name: `${ILM_PREFIX}*` });

  await Promise.all(Object.entries(policies).map(([name, _]) => es.ilm.deleteLifecycle({ name })));
};

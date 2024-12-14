/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';

const DS_PREFIX = 'testing-datastream';
const ILM_PREFIX = 'testing-ilm';

export const randomDatastream = async (es: Client, policyName?: string): Promise<string> => {
  const name = `${DS_PREFIX}-${Date.now()}`;

  let settings = {};

  if (policyName) {
    settings = {
      ...settings,
      'index.lifecycle.name': policyName,
    };
  }

  const indexTemplateBody = {
    index_patterns: [`${DS_PREFIX}-*`],
    data_stream: {},
    template: {
      settings,
    },
  };

  await es.indices.putIndexTemplate({
    name: DS_PREFIX,
    body: indexTemplateBody,
  });

  await es.indices.createDataStream({ name });

  return name;
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

export const cleanupPolicies = async (es: Client) => {
  const policies = await es.ilm.getLifecycle({ name: `${ILM_PREFIX}*` });

  await Promise.all(Object.entries(policies).map(([name, _]) => es.ilm.deleteLifecycle({ name })));
};

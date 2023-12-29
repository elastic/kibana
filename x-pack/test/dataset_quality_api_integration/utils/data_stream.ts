/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export async function createIndexTemplateAndDataStream(
  es: Client,
  name: string,
  indexTemplateOverrides?: Partial<IndicesPutIndexTemplateRequest>
) {
  // A data stream requires an index template before it can be created.
  await es.indices.putIndexTemplate({
    name: `${name}_index_template`,
    index_patterns: [name + '*'],
    data_stream: {},
    ...(indexTemplateOverrides ?? {}),
    template: {
      mappings: {
        ...(indexTemplateOverrides?.template?.mappings ?? {}),
        properties: indexTemplateOverrides?.template?.mappings?.properties ?? {
          '@timestamp': {
            type: 'date',
          },
          source: {
            type: 'keyword',
          },
          reference: {
            type: 'keyword',
          },
          params: {
            enabled: false,
            type: 'object',
          },
          host: {
            properties: {
              hostname: {
                type: 'text',
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 256,
                  },
                },
              },
              id: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
            },
          },
        },
      },
    },
  });

  await es.indices.createDataStream({ name });
}

async function deleteComposableIndexTemplate(es: Client, name: string) {
  await es.indices.deleteIndexTemplate({ name });
}

export async function deleteIndexTemplateAndDataStream(
  es: Client,
  name: string,
  indexTemplateName?: string
) {
  await es.indices.deleteDataStream({ name });
  await deleteComposableIndexTemplate(es, indexTemplateName ?? `${name}_index_template`);
}

export async function getDataStreamSettingsOfFirstIndex(es: Client, name: string) {
  const matchingIndexesObj = await es.indices.getSettings({ index: name });
  return Object.values(matchingIndexesObj ?? {})[0]?.settings;
}

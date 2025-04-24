/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import expect from '@kbn/expect';
import { StreamsSupertestRepositoryClient } from './repository_client';

type StreamPutItem = Omit<Streams.WiredStream.UpsertRequest, 'dashboards' | 'queries'> & {
  name: string;
};

const streams: StreamPutItem[] = [
  {
    name: 'logs',
    stream: {
      description: '',
      ingest: {
        lifecycle: { dsl: {} },
        processing: [],
        wired: {
          fields: {
            '@timestamp': {
              type: 'date',
            },
            message: {
              type: 'match_only_text',
            },
            'host.name': {
              type: 'keyword',
            },
            'log.level': {
              type: 'keyword',
            },
            'stream.name': {
              type: 'system',
            },
          },
          routing: [
            {
              destination: 'logs.test',
              if: {
                and: [
                  {
                    field: 'numberfield',
                    operator: 'gt',
                    value: 15,
                  },
                ],
              },
            },
            {
              destination: 'logs.test2',
              if: {
                and: [
                  {
                    field: 'field2',
                    operator: 'eq',
                    value: 'abc',
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
  {
    name: 'logs.test',
    stream: {
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        processing: [],
        wired: {
          routing: [],
          fields: {
            numberfield: {
              type: 'long',
            },
          },
        },
      },
    },
  },
  {
    name: 'logs.test2',
    stream: {
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        processing: [
          {
            grok: {
              field: 'message',
              patterns: ['%{NUMBER:numberfield}'],
              if: { always: {} },
            },
          },
        ],
        wired: {
          fields: {
            field2: {
              type: 'keyword',
            },
          },
          routing: [],
        },
      },
    },
  },
  {
    name: 'logs.deeply.nested.streamname',
    stream: {
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        processing: [],
        wired: {
          fields: {
            field2: {
              type: 'keyword',
            },
          },
          routing: [],
        },
      },
    },
  },
];

export async function createStreams(apiClient: StreamsSupertestRepositoryClient) {
  for (const { name, ...stream } of streams) {
    await apiClient
      .fetch('PUT /api/streams/{name} 2023-10-31', {
        params: {
          body: {
            ...stream,
            dashboards: [],
            queries: [],
          },
          path: { name },
        },
      })
      .expect(200)
      .then((response) => expect(response.body.acknowledged).to.eql(true));
  }
}

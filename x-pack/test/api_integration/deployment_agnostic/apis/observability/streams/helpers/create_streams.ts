/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamUpsertRequest } from '@kbn/streams-schema';
import expect from '@kbn/expect';
import { StreamsSupertestRepositoryClient } from './repository_client';

type StreamPutItem = Omit<StreamUpsertRequest, 'dashboards'> & { name: string };

const streams: StreamPutItem[] = [
  {
    name: 'logs',
    stream: {
      ingest: {
        lifecycle: { dsl: {} },
        processing: [],
        wired: {
          fields: {
            '@timestamp': {
              type: 'date',
            },
            'stream.name': {
              type: 'keyword',
            },
            'scope.dropped_attributes_count': {
              type: 'long',
            },
            dropped_attributes_count: {
              type: 'long',
            },
            'resource.dropped_attributes_count': {
              type: 'long',
            },
            'resource.schema_url': {
              type: 'keyword',
            },
            'scope.name': {
              type: 'keyword',
            },
            'scope.schema_url': {
              type: 'keyword',
            },
            'scope.version': {
              type: 'keyword',
            },
            observed_timestamp: {
              type: 'date',
            },
            trace_id: {
              type: 'keyword',
            },
            span_id: {
              type: 'keyword',
            },
            severity_text: {
              type: 'keyword',
            },
            'body.text': {
              type: 'match_only_text',
            },
            'severity.number': {
              type: 'long',
            },
            'resource.attributes.host.name': {
              type: 'keyword',
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
      ingest: {
        lifecycle: { inherit: {} },
        processing: [],
        wired: {
          routing: [],
          fields: {
            'attributes.numberfield': {
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
      ingest: {
        lifecycle: { inherit: {} },
        processing: [
          {
            grok: {
              field: 'body.text',
              patterns: ['%{NUMBER:attributes.numberfield}'],
              if: { always: {} },
            },
          },
        ],
        wired: {
          fields: {
            'attributes.field2': {
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
      ingest: {
        lifecycle: { inherit: {} },
        processing: [],
        wired: {
          fields: {
            'attributes.field2': {
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
      .fetch('PUT /api/streams/{name}', {
        params: {
          body: {
            ...stream,
            dashboards: [],
          } as StreamUpsertRequest,
          path: { name },
        },
      })
      .expect(200)
      .then((response) => expect(response.body.acknowledged).to.eql(true));
  }
}

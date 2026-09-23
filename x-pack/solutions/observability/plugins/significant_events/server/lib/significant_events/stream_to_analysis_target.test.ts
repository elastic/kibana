/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { streamToAnalysisTarget } from './stream_to_analysis_target';

const createWiredStreamDefinition = (name: string): Streams.WiredStream.Definition => ({
  name,
  description: 'Wired stream for tests',
  updated_at: new Date().toISOString(),
  type: 'wired',
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    failure_store: { inherit: {} },
    wired: {
      fields: {},
      routing: [],
    },
  },
});

const createQueryStreamDefinition = (
  name: string,
  view: string
): Streams.QueryStream.Definition => ({
  name,
  description: 'Query stream for tests',
  type: 'query',
  updated_at: new Date().toISOString(),
  query: {
    view,
    esql: `FROM ${view}`,
  },
});

describe('streamToAnalysisTarget', () => {
  it('maps a wired stream to hierarchy sources and the stream name as the sampling source', () => {
    const definition = createWiredStreamDefinition('logs.app');

    expect(streamToAnalysisTarget(definition)).toEqual({
      id: 'logs.app',
      name: 'logs.app',
      description: 'Wired stream for tests',
      sources: ['logs.app', 'logs.app.*'],
      samplingSource: 'logs.app',
    });
  });

  it('maps a query stream so sources and samplingSource both resolve to query.view', () => {
    const definition = createQueryStreamDefinition('cars.electric', '$.cars.electric');

    expect(streamToAnalysisTarget(definition)).toEqual({
      id: 'cars.electric',
      name: 'cars.electric',
      description: 'Query stream for tests',
      sources: ['$.cars.electric'],
      samplingSource: '$.cars.electric',
    });
  });
});

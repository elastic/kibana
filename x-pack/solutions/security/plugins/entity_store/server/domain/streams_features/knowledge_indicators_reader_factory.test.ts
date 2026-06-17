/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { StreamsPluginStart } from '@kbn/streams-plugin/server';
import {
  __NO_OP_KI_READER_FOR_TESTING,
  createKnowledgeIndicatorsReaderFromStreamsStart,
} from './knowledge_indicators_reader_factory';

const logger = { debug: jest.fn(), warn: jest.fn() } as unknown as Logger;
const request = {} as KibanaRequest;

describe('createKnowledgeIndicatorsReaderFromStreamsStart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the shared no-op reader when streams is undefined', async () => {
    const reader = await createKnowledgeIndicatorsReaderFromStreamsStart({
      streams: undefined,
      request,
      logger,
    });
    expect(reader).toBe(__NO_OP_KI_READER_FOR_TESTING);
    expect(await reader.listDatasetAnalysisFeatures()).toEqual([]);
    expect(await reader.resolveIndexPatterns('any')).toEqual([]);
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  it('delegates to streams.getKnowledgeIndicatorsReader when streams is present', async () => {
    const delegateReader = { listDatasetAnalysisFeatures: jest.fn() };
    const streams = {
      getKnowledgeIndicatorsReader: jest.fn(async () => delegateReader),
    } as unknown as StreamsPluginStart;

    const reader = await createKnowledgeIndicatorsReaderFromStreamsStart({
      streams,
      request,
      logger,
    });

    expect(streams.getKnowledgeIndicatorsReader).toHaveBeenCalledWith({ request });
    expect(reader).toBe(delegateReader);
    expect(logger.debug).not.toHaveBeenCalled();
  });
});

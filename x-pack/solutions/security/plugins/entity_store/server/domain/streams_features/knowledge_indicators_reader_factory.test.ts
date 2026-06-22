/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import type { EntityStoreCoreSetup } from '../../types';
import {
  __NO_OP_KI_READER_FOR_TESTING,
  createKnowledgeIndicatorsReader,
} from './knowledge_indicators_reader_factory';

const buildLogger = () => {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<Pick<Logger, 'debug' | 'info' | 'warn' | 'error'>> & Logger;
};

const buildFakeRequest = () => ({ headers: {} } as KibanaRequest);

const buildCore = (pluginsStart: Record<string, unknown>): EntityStoreCoreSetup =>
  ({
    getStartServices: jest.fn().mockResolvedValue([{}, pluginsStart, {}]),
  } as unknown as EntityStoreCoreSetup);

describe('createKnowledgeIndicatorsReader', () => {
  it('delegates to streams.getKnowledgeIndicatorsReader and forwards the fakeRequest', async () => {
    const logger = buildLogger();
    const fakeRequest = buildFakeRequest();
    const reader: StreamsKnowledgeIndicatorsReader = {
      listEntityFeatures: jest.fn().mockResolvedValue([]),
      listDependencyFeatures: jest.fn().mockResolvedValue([]),
      listSchemaFeatures: jest.fn().mockResolvedValue([]),
      resolveIndexPatterns: jest.fn().mockResolvedValue(['logs.k8s.pods']),
    };
    const getKnowledgeIndicatorsReader = jest.fn().mockResolvedValue(reader);
    const core = buildCore({ streams: { getKnowledgeIndicatorsReader } });

    const result = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });

    expect(result).toBe(reader);
    expect(getKnowledgeIndicatorsReader).toHaveBeenCalledTimes(1);
    expect(getKnowledgeIndicatorsReader).toHaveBeenCalledWith({ request: fakeRequest });
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('returns the no-op reader when the streams plugin is not enabled (optional dep missing)', async () => {
    const logger = buildLogger();
    const fakeRequest = buildFakeRequest();
    const core = buildCore({}); // pluginsStart.streams === undefined

    const result = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });

    expect(result).toBe(__NO_OP_KI_READER_FOR_TESTING);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Streams plugin not available')
    );
  });

  it('the no-op reader yields empty arrays for every method without performing any I/O', async () => {
    expect(await __NO_OP_KI_READER_FOR_TESTING.listEntityFeatures()).toEqual([]);
    expect(await __NO_OP_KI_READER_FOR_TESTING.listDependencyFeatures()).toEqual([]);
    expect(await __NO_OP_KI_READER_FOR_TESTING.listSchemaFeatures()).toEqual([]);
    expect(await __NO_OP_KI_READER_FOR_TESTING.resolveIndexPatterns('any-stream')).toEqual([]);
  });

  it('the no-op reader is the same reference across invocations (callers can compare by identity if needed)', async () => {
    const logger = buildLogger();
    const fakeRequest = buildFakeRequest();
    const core = buildCore({});

    const a = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });
    const b = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });

    expect(a).toBe(b);
    expect(a).toBe(__NO_OP_KI_READER_FOR_TESTING);
  });

  it('propagates errors from streams.getKnowledgeIndicatorsReader to the caller', async () => {
    const logger = buildLogger();
    const fakeRequest = buildFakeRequest();
    const failure = new Error('unauthorized');
    const core = buildCore({
      streams: { getKnowledgeIndicatorsReader: jest.fn().mockRejectedValue(failure) },
    });

    await expect(createKnowledgeIndicatorsReader({ core, fakeRequest, logger })).rejects.toBe(
      failure
    );
  });
});

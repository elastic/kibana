/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { buildFetchSourceStepDefinition } from './fetch_source_step';
import { runAdapter, UnknownAdapterError } from '../../../adapters';
import type { SourceHit } from '../../../adapters';

jest.mock('../../../adapters', () => {
  const actual = jest.requireActual('../../../adapters');
  return { ...actual, runAdapter: jest.fn() };
});

const runAdapterMock = runAdapter as jest.Mock;

const SOURCE: SourceHit = {
  _id: 'rss:mandiant-research',
  _source: { adapter_type: 'rss', name: 'Mandiant Research' },
};

const buildContext = (input: unknown): StepHandlerContext<unknown, unknown> =>
  ({
    input,
    abortSignal: new AbortController().signal,
  } as unknown as StepHandlerContext<unknown, unknown>);

const buildStep = () => {
  const logger = loggingSystemMock.createLogger();
  const step = buildFetchSourceStepDefinition({ logger });
  return { logger, handler: step.handler };
};

describe('buildFetchSourceStepDefinition handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a descriptive error when source arrives as a string', async () => {
    const { handler } = buildStep();
    const result = await handler(buildContext({ source: '[object Object]' }));

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toMatch(/received "source" as a string/);
    expect(result.error?.message).toMatch(/foreach\.item/);
    expect(runAdapterMock).not.toHaveBeenCalled();
  });

  it('returns adapter output on the happy path', async () => {
    const reports = [{ '@timestamp': '2026-09-08T00:00:00.000Z' }];
    runAdapterMock.mockResolvedValue(reports);
    const { handler } = buildStep();

    const result = await handler(buildContext({ source: SOURCE }));

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual({
      adapter_type: 'rss',
      source_id: 'rss:mandiant-research',
      total_fetched: 1,
      reports,
    });
    expect(runAdapterMock).toHaveBeenCalledWith(
      SOURCE,
      expect.objectContaining({ abortSignal: expect.any(AbortSignal) })
    );
  });

  it('propagates UnknownAdapterError as-is', async () => {
    const unknown = new UnknownAdapterError('bogus', 'src-1');
    runAdapterMock.mockRejectedValue(unknown);
    const { handler } = buildStep();

    const result = await handler(buildContext({ source: SOURCE }));

    expect(result.error).toBe(unknown);
  });

  it('wraps generic adapter failures with the source id', async () => {
    runAdapterMock.mockRejectedValue(new Error('HTTP 503'));
    const { handler } = buildStep();

    const result = await handler(buildContext({ source: SOURCE }));

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe(
      'Failed to fetch threat intelligence source rss:mandiant-research: HTTP 503'
    );
  });
});

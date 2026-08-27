/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { Logger } from '@kbn/core/server';
import { SloToolValidationError, toToolErrorResult } from './errors';

const createLogger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

describe('SloToolValidationError', () => {
  it('is an instance of Error', () => {
    const err = new SloToolValidationError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('test');
  });
});

describe('toToolErrorResult', () => {
  it('returns error result shape', () => {
    const logger = createLogger();
    const result = toToolErrorResult({ error: new Error('boom'), logger });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toBe('boom');
  });

  it('uses logger.debug for SloToolValidationError', () => {
    const logger = createLogger();
    toToolErrorResult({ error: new SloToolValidationError('bad input'), logger });

    expect(logger.debug).toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses logger.warn for non-validation errors', () => {
    const logger = createLogger();
    toToolErrorResult({ error: new Error('unexpected'), logger });

    expect(logger.warn).toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('includes metadata when provided', () => {
    const logger = createLogger();
    const result = toToolErrorResult({
      error: new Error('boom'),
      metadata: { foo: 'bar' },
      logger,
    });

    expect(result.results[0].data).toMatchObject({ metadata: { foo: 'bar' } });
  });

  it('omits metadata when not provided', () => {
    const logger = createLogger();
    const result = toToolErrorResult({ error: new Error('boom'), logger });

    expect((result.results[0].data as Record<string, unknown>).metadata).toBeUndefined();
  });

  it('stringifies non-Error inputs via String()', () => {
    const logger = createLogger();
    const result = toToolErrorResult({ error: 42, logger });

    expect(result.results[0].data.message).toBe('42');
  });
});

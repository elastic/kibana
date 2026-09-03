/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogLevel } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';

import { PND_LOG_PREFIX, createPndLogger, withPndLogPrefix } from '.';

/** Every level a PND call site can use; the prefix must be unconditional across all of them. */
const LEVELS = ['debug', 'error', 'fatal', 'info', 'trace', 'warn'] as const;

describe('PND_LOG_PREFIX', () => {
  it('is the exact marker the README documents for grepping the PND server log', () => {
    expect(PND_LOG_PREFIX).toEqual('[kibana-pnd]');
  });
});

describe('withPndLogPrefix', () => {
  it('stamps the prefix on a plain message', () => {
    expect(withPndLogPrefix('Setting up PND plugin')).toEqual('[kibana-pnd] Setting up PND plugin');
  });

  it('leaves an already-prefixed message untouched', () => {
    expect(withPndLogPrefix('[kibana-pnd] Setting up PND plugin')).toEqual(
      '[kibana-pnd] Setting up PND plugin'
    );
  });

  it('stamps the prefix on an empty message', () => {
    expect(withPndLogPrefix('')).toEqual('[kibana-pnd] ');
  });
});

describe('createPndLogger', () => {
  it.each(LEVELS)('stamps the prefix on a %s message', (level) => {
    const delegate = loggerMock.create();

    createPndLogger(delegate)[level]('something happened');

    expect(loggerMock.collect(delegate)[level]).toEqual([['[kibana-pnd] something happened']]);
  });

  it.each(LEVELS)('stamps the prefix on a lazily-evaluated %s message', (level) => {
    const delegate = loggerMock.create();

    createPndLogger(delegate)[level](() => 'something happened');

    expect(loggerMock.collect(delegate)[level]).toEqual([['[kibana-pnd] something happened']]);
  });

  it.each(LEVELS)('keeps a lazy %s message a thunk, so it stays unevaluated', (level) => {
    const delegate = loggerMock.create();
    const message = jest.fn().mockReturnValue('expensive to build');

    createPndLogger(delegate)[level](message);

    expect(message).not.toHaveBeenCalled();
  });

  it('forwards the ECS meta unchanged', () => {
    const delegate = loggerMock.create();

    createPndLogger(delegate).info('something happened', { labels: { watch: 'deep' } });

    expect(delegate.info).toHaveBeenCalledWith('[kibana-pnd] something happened', {
      labels: { watch: 'deep' },
    });
  });

  it.each(['error', 'fatal', 'warn'] as const)(
    'forwards an Error to %s untouched, so its stack is never falsified',
    (level) => {
      const delegate = loggerMock.create();
      const error = new Error('boom');

      createPndLogger(delegate)[level](error);

      expect(loggerMock.collect(delegate)[level]).toEqual([[error]]);
    }
  );

  it('stamps the prefix on messages from a child logger obtained with get()', () => {
    const delegate = loggerMock.create();

    createPndLogger(delegate).get('child').warn('something happened');

    expect(loggerMock.collect(delegate).warn).toEqual([['[kibana-pnd] something happened']]);
  });

  it('delegates isLevelEnabled', () => {
    const delegate = loggerMock.create();
    delegate.isLevelEnabled.mockReturnValue(false);

    expect(createPndLogger(delegate).isLevelEnabled('debug')).toBe(false);
  });

  it('stamps the prefix on the message of a raw log record', () => {
    const delegate = loggerMock.create();

    createPndLogger(delegate).log({
      context: 'plugins.pnd',
      level: LogLevel.Info,
      message: 'something happened',
      pid: 1,
      timestamp: new Date(0),
    });

    expect(delegate.log).toHaveBeenCalledWith(
      expect.objectContaining({ message: '[kibana-pnd] something happened' })
    );
  });

  it('never double-stamps, so wrapping an already-wrapped logger is a no-op', () => {
    const delegate = loggerMock.create();

    createPndLogger(createPndLogger(delegate)).info('something happened');

    expect(loggerMock.collect(delegate).info).toEqual([['[kibana-pnd] something happened']]);
  });
});

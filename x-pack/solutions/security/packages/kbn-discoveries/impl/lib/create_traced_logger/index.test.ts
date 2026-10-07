/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { createTracedLogger } from '.';

const executionUuid = 'test-execution-uuid-1234';
const mockLogger = loggingSystemMock.createLogger();

describe('createTracedLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trace', () => {
    it('prepends the execution prefix to string messages', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.trace('something happened');

      expect(mockLogger.trace).toHaveBeenCalledWith(
        `[execution: ${executionUuid}] something happened`
      );
    });

    it('wraps lazy message functions to prepend the execution prefix', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.trace(() => 'lazy message');

      const calledArg = mockLogger.trace.mock.calls[0][0];
      expect(typeof calledArg).toBe('function');
      expect((calledArg as () => string)()).toBe(`[execution: ${executionUuid}] lazy message`);
    });

    it('forwards meta unchanged', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);
      const meta = { labels: { foo: 'bar' } };

      traced.trace('msg', meta);

      expect(mockLogger.trace).toHaveBeenCalledWith(`[execution: ${executionUuid}] msg`, meta);
    });
  });

  describe('debug', () => {
    it('prepends the execution prefix to string messages', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.debug('debug message');

      expect(mockLogger.debug).toHaveBeenCalledWith(`[execution: ${executionUuid}] debug message`);
    });

    it('wraps lazy message functions to prepend the execution prefix', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.debug(() => 'lazy debug');

      const calledArg = mockLogger.debug.mock.calls[0][0];
      expect(typeof calledArg).toBe('function');
      expect((calledArg as () => string)()).toBe(`[execution: ${executionUuid}] lazy debug`);
    });
  });

  describe('info', () => {
    it('prepends the execution prefix to string messages', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.info('info message');

      expect(mockLogger.info).toHaveBeenCalledWith(`[execution: ${executionUuid}] info message`);
    });

    it('wraps lazy message functions to prepend the execution prefix', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.info(() => 'lazy info');

      const calledArg = mockLogger.info.mock.calls[0][0];
      expect(typeof calledArg).toBe('function');
      expect((calledArg as () => string)()).toBe(`[execution: ${executionUuid}] lazy info`);
    });
  });

  describe('warn', () => {
    it('prepends the execution prefix to string messages', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.warn('warning');

      expect(mockLogger.warn).toHaveBeenCalledWith(`[execution: ${executionUuid}] warning`);
    });

    it('passes Error objects through unchanged', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);
      const error = new Error('something broke');

      traced.warn(error);

      expect(mockLogger.warn).toHaveBeenCalledWith(error);
    });

    it('wraps lazy message functions to prepend the execution prefix', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.warn(() => 'lazy warning');

      const calledArg = mockLogger.warn.mock.calls[0][0];
      expect(typeof calledArg).toBe('function');
      expect((calledArg as () => string)()).toBe(`[execution: ${executionUuid}] lazy warning`);
    });
  });

  describe('error', () => {
    it('prepends the execution prefix to string messages', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.error('error occurred');

      expect(mockLogger.error).toHaveBeenCalledWith(`[execution: ${executionUuid}] error occurred`);
    });

    it('passes Error objects through unchanged', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);
      const error = new Error('kaboom');

      traced.error(error);

      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('forwards meta unchanged', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);
      const meta = { labels: { code: '500' } };

      traced.error('server error', meta);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `[execution: ${executionUuid}] server error`,
        meta
      );
    });
  });

  describe('fatal', () => {
    it('prepends the execution prefix to string messages', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.fatal('fatal error');

      expect(mockLogger.fatal).toHaveBeenCalledWith(`[execution: ${executionUuid}] fatal error`);
    });

    it('passes Error objects through unchanged', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);
      const error = new Error('total failure');

      traced.fatal(error);

      expect(mockLogger.fatal).toHaveBeenCalledWith(error);
    });
  });

  describe('does not pass undefined meta to the underlying logger', () => {
    it('calls underlying logger with only the message when meta is omitted', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);

      traced.info('no meta');

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info.mock.calls[0]).toHaveLength(1);
    });

    it('calls underlying logger with message and meta when meta is provided', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);
      const meta = { labels: { key: 'val' } };

      traced.info('with meta', meta);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info.mock.calls[0]).toHaveLength(2);
      expect(mockLogger.info.mock.calls[0][1]).toBe(meta);
    });
  });

  describe('log', () => {
    it('delegates to the underlying logger without modification', () => {
      const traced = createTracedLogger(mockLogger, executionUuid);
      const record = {
        context: 'test',
        level: { id: 'info' as const, supports: () => true, value: 6 },
        message: 'raw record',
        pid: 1234,
        timestamp: new Date(),
      };

      traced.log(record);

      expect(mockLogger.log).toHaveBeenCalledWith(record);
    });
  });

  describe('isLevelEnabled', () => {
    it('delegates to the underlying logger', () => {
      mockLogger.isLevelEnabled.mockReturnValue(true);
      const traced = createTracedLogger(mockLogger, executionUuid);

      const result = traced.isLevelEnabled('debug');

      expect(result).toBe(true);
      expect(mockLogger.isLevelEnabled).toHaveBeenCalledWith('debug');
    });
  });

  describe('get', () => {
    it('returns a traced logger for the child context', () => {
      const childLogger = loggingSystemMock.createLogger();
      mockLogger.get.mockReturnValue(childLogger);
      const traced = createTracedLogger(mockLogger, executionUuid);

      const child = traced.get('child', 'path');

      expect(mockLogger.get).toHaveBeenCalledWith('child', 'path');

      child.info('child message');

      expect(childLogger.info).toHaveBeenCalledWith(`[execution: ${executionUuid}] child message`);
    });
  });
});

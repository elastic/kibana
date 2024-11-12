/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';

function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

/**
 * Wraps the specified object instance with debug log statements of all method calls.
 *
 * @param prefix - The string to prefix to all log messages
 * @param log - The logger to use
 * @param instance - The object being wrapped
 */
export function logWrapper<T extends Record<string, Function>>(
  prefix: string,
  log: ToolingLog,
  instance: T
): T {
  const logger = prepareLogger(log, prefix);
  return Object.keys(instance).reduce((acc, prop) => {
    const baseFn = acc[prop];
    (acc as Record<string, Function>)[prop] = (...args: unknown[]) => {
      logger.start(prop, args);
      const result = baseFn.apply(instance, args);
      if (isPromise(result)) {
        result.then(logger.end, logger.end);
      } else {
        logger.end();
      }
      return result;
    };
    return acc;
  }, instance);
}

function prepareLogger(log: ToolingLog, prefix: string) {
  let now = Date.now();
  let currentContext = '';

  return {
    start: (prop: string, args: unknown[]) => {
      if (prop === '') {
        return;
      }
      currentContext = `${prop}(${args
        .map((arg) => (typeof arg === 'string' ? `'${arg}'` : JSON.stringify(arg)))
        .join(', ')})`;
      log.debug(`${prefix}.${currentContext}`);
      now = Date.now();
    },
    end: () => {
      if (currentContext === '') {
        return;
      }
      log.debug(`${prefix}.${currentContext} - (Took ${Date.now() - now} ms)`);
      now = Date.now();
      currentContext = '';
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ToolingLog } from '@kbn/dev-utils';

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
  return Object.keys(instance).reduce((acc, prop) => {
    const baseFn = acc[prop];
    (acc as Record<string, Function>)[prop] = (...args: unknown[]) => {
      logMethodCall(log, prefix, prop, args);
      return baseFn.apply(instance, args);
    };
    return acc;
  }, instance);
}

function logMethodCall(log: ToolingLog, prefix: string, prop: string, args: unknown[]) {
  const argsStr = args.map((arg) => (typeof arg === 'string' ? `'${arg}'` : arg)).join(', ');
  log.debug(`${prefix}.${prop}(${argsStr})`);
}

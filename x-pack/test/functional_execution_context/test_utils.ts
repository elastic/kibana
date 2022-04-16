/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Fs from 'fs/promises';
import Path from 'path';
import { isEqualWith } from 'lodash';
import type { Ecs, KibanaExecutionContext } from '@kbn/core/server';
import type { RetryService } from '../../../test/common/services/retry';

export const logFilePath = Path.resolve(__dirname, './kibana.log');
export const ANY = Symbol('any');

export function isExecutionContextLog(
  record: string | undefined,
  executionContext: KibanaExecutionContext
) {
  if (!record) return false;
  try {
    const object = JSON.parse(record);
    return isEqualWith(object, executionContext, function customizer(obj1: any, obj2: any) {
      if (obj2 === ANY) return true;
    });
  } catch (e) {
    return false;
  }
}

// to avoid splitting log record containing \n symbol
const endOfLine = /(?<=})\s*\n/;
export async function assertLogContains({
  description,
  predicate,
  retry,
}: {
  description: string;
  predicate: (record: Ecs) => boolean;
  retry: RetryService;
}): Promise<void> {
  // logs are written to disk asynchronously. I sacrificed performance to reduce flakiness.
  await retry.waitFor(description, async () => {
    const logsStr = await Fs.readFile(logFilePath, 'utf-8');
    const normalizedRecords = logsStr
      .split(endOfLine)
      .filter(Boolean)
      .map((s) => JSON.parse(s));

    return normalizedRecords.some(predicate);
  });
}

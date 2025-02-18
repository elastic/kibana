/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file,@typescript-eslint/no-explicit-any */

import type { ToolingLog } from '@kbn/tooling-log';
import { isPromise } from '@kbn/std';
import moment from 'moment';
import { once } from 'lodash';
import { createToolingLogger } from './utils';

interface UsageRecordJson {
  id: string;
  start: string;
  finish: string;
  durationMs: number;
  duration: string;
  status: 'success' | 'failure' | 'pending';
  stack: string;
  error?: string;
}

interface UsageTrackerOptions {
  logger?: ToolingLog;
  dumpOnProcessExit?: boolean;
  maxRecordsPerType?: number;
}

type AnyFunction = (...args: any) => any;

/**
 * Keep track of usage of stuff. Example: can track how many time a given utility/function was called.
 *
 * ** Should not be used for production code **
 */
class UsageTracker {
  private readonly records: Record<
    string,
    {
      count: number;
      records: UsageRecord[];
    }
  > = {};
  private readonly options: Required<UsageTrackerOptions>;
  private wrappedCallbacks = new WeakSet<Function>();

  constructor({
    logger = createToolingLogger(),
    dumpOnProcessExit = false,
    maxRecordsPerType = 25,
  }: UsageTrackerOptions = {}) {
    this.options = {
      logger,
      dumpOnProcessExit,
      maxRecordsPerType,
    };

    try {
      if (dumpOnProcessExit && process && process.once) {
        const nodeEvents = ['SIGINT', 'exit', 'uncaughtException', 'unhandledRejection'];
        const logStats = once(() => {
          logger.verbose(`Tooling usage tracking:
${this.toText()}`);
        });

        logger.verbose(
          `${this.constructor.name}: Setting up event listeners for: ${nodeEvents.join(' | ')}`
        );

        nodeEvents.forEach((event) => {
          process.once(event, logStats);
        });
      }
    } catch (err) {
      logger.debug(`Unable to setup 'dumpOnProcessExit': ${err.message}`);
    }
  }

  protected formatDuration(durationMs: number): string {
    const durationObj = moment.duration(durationMs);
    const pad = (num: number, max = 2): string => {
      return String(num).padStart(max, '0');
    };
    const hours = pad(durationObj.hours());
    const minutes = pad(durationObj.minutes());
    const seconds = pad(durationObj.seconds());
    const milliseconds = pad(durationObj.milliseconds(), 3);

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  create(id: string): UsageRecord {
    this.records[id] = this.records[id] ?? { count: 0, records: [] };

    const maxRecords = this.options.maxRecordsPerType;
    const usageRecord = new UsageRecord(id);
    const usageForId = this.records[id];

    usageForId.count++;
    usageForId.records.push(usageRecord);

    if (usageForId.records.length > maxRecords) {
      usageForId.records.splice(0, usageForId.records.length - maxRecords);
    }

    return usageRecord;
  }

  toJSON(): UsageRecordJson[] {
    return Object.values(this.records)
      .map(({ records }) => records)
      .flat()
      .map((record) => record.toJSON());
  }

  /**
   * Returns a `JSON.parse()` compatible string of all of the entries captured
   */
  toString(): string {
    return JSON.stringify(this.toJSON());
  }

  getSummary(): Array<{ name: string; count: number; shortestMs: number; longestMs: number }> {
    return Object.entries(this.records).map(([funcName, record]) => {
      const funcSummary = {
        name: funcName,
        count: record.count,
        shortestMs: 0,
        longestMs: 0,
      };

      for (const instanceRecord of record.records) {
        const instanceDuration = instanceRecord.toJSON().durationMs;

        funcSummary.shortestMs =
          funcSummary.shortestMs > 0
            ? Math.min(funcSummary.shortestMs, instanceDuration)
            : instanceDuration;

        funcSummary.longestMs =
          funcSummary.longestMs > 0
            ? Math.max(funcSummary.longestMs, instanceDuration)
            : instanceDuration;
      }

      return funcSummary;
    });
  }

  toSummaryTable(): string {
    const separator = ' | ';
    const width = {
      name: 60,
      count: 5,
      shortest: 12,
      longest: 12,
    };

    const maxLineLength =
      Object.values(width).reduce((acc, n) => acc + n, 0) +
      (Object.keys(width).length - 1) * separator.length;

    const summaryText = this.getSummary().map(({ name, count, shortestMs, longestMs }) => {
      const fmtName = name.padEnd(width.name);
      const fmtCount = String(count).padEnd(width.count);
      const fmtShortest = this.formatDuration(shortestMs);
      const fmtLongest = this.formatDuration(longestMs);

      return `${fmtName}${separator}${fmtCount}${separator}${fmtShortest}${separator}${fmtLongest}`;
    });

    return `${'-'.repeat(maxLineLength)}
${'Name'.padEnd(width.name)}${separator}${'Count'.padEnd(
      width.count
    )}${separator}${'Shortest'.padEnd(width.shortest)}${separator}${'longest'.padEnd(width.longest)}
${'-'.repeat(maxLineLength)}
${summaryText.join('\n')}
${'-'.repeat(maxLineLength)}
`;
  }

  /**
   * Returns a string with information about the entries captured
   */
  toText(): string {
    return (
      this.toSummaryTable() +
      Object.entries(this.records)
        .map(([key, { count, records: usageRecords }]) => {
          return `
[${key}] Invoked ${count} times. Records${
            count > this.options.maxRecordsPerType
              ? ` (last ${this.options.maxRecordsPerType})`
              : ''
          }:
${'-'.repeat(98)}
${usageRecords
  .map((record) => {
    return record.toText();
  })
  .join('\n')}
`;
        })
        .join('')
    );
  }

  public dump(logger?: ToolingLog) {
    (logger ?? this.options.logger).info(
      `${this.constructor.name}: usage tracking:
${this.toText()}`
    );
  }

  /**
   * Will wrap the provided callback and provide usage tracking on it.
   * @param callback
   * @param name
   */
  public track<F extends AnyFunction = AnyFunction>(callback: F): F;
  public track<F extends AnyFunction = AnyFunction>(name: string, callback: F): F;
  public track<F extends AnyFunction = AnyFunction>(
    callbackOrName: F | string,
    maybeCallback?: F
  ): F {
    const isArg1Callback = typeof callbackOrName === 'function';

    if (!isArg1Callback && !maybeCallback) {
      throw new Error(
        `Second argument to 'track()' can not be undefined when first argument defined a name`
      );
    }

    const callback = (isArg1Callback ? callbackOrName : maybeCallback) as F;
    const name = isArg1Callback ? undefined : (callbackOrName as string);

    if (this.wrappedCallbacks.has(callback)) {
      return callback;
    }

    const functionName =
      name ||
      callback.name ||
      // Get the file/line number where function was defined
      ((new Error('-').stack ?? '').split('\n')[2] || '').trim() ||
      // Last resort: get 50 first char. of function code
      callback.toString().trim().substring(0, 50);

    const wrappedFunction = ((...args) => {
      const usageRecord = this.create(functionName);

      try {
        const response = callback(...args);

        if (isPromise(response)) {
          response
            .then(() => {
              usageRecord.set('success');
            })
            .catch((e) => {
              usageRecord.set('failure', e.message);
            });
        } else {
          usageRecord.set('success');
        }

        return response;
      } catch (e) {
        usageRecord.set('failure', e.message);
        throw e;
      }
    }) as F;

    this.wrappedCallbacks.add(wrappedFunction);

    return wrappedFunction;
  }
}

class UsageRecord {
  private start: UsageRecordJson['start'] = new Date().toISOString();
  private finish: UsageRecordJson['finish'] = '';
  private durationMs = 0;
  private duration: UsageRecordJson['duration'] = '';
  private status: UsageRecordJson['status'] = 'pending';
  private error: UsageRecordJson['error'];
  private stack: string = '';

  constructor(private readonly id: string) {
    Error.captureStackTrace(this);
    this.stack = `\n${this.stack.split('\n').slice(2).join('\n')}`;
  }

  set(status: Exclude<UsageRecordJson['status'], 'pending'>, error?: string) {
    this.finish = new Date().toISOString();
    this.error = error;
    this.status = status;

    const durationDiff = moment.duration(moment(this.finish).diff(this.start));

    this.durationMs = durationDiff.asMilliseconds();
    this.duration = `h[${durationDiff.hours()}]  m[${durationDiff.minutes()}]  s[${durationDiff.seconds()}]  ms[${durationDiff.milliseconds()}]`;
  }

  public toJSON(): UsageRecordJson {
    const { id, start, finish, status, error, duration, durationMs, stack } = this;

    return {
      id,
      start,
      finish,
      durationMs,
      duration,
      status,
      stack,
      ...(error ? { error } : {}),
    };
  }

  public toString(): string {
    return JSON.stringify(this.toJSON());
  }

  public toText(): string {
    const data = this.toJSON();
    const keys = Object.keys(data).sort();

    return keys.reduce((acc, key) => {
      return acc.concat(`\n${key}: ${data[key as keyof UsageRecordJson]}`);
    }, '');
  }
}

export const usageTracker = new UsageTracker({ dumpOnProcessExit: true });

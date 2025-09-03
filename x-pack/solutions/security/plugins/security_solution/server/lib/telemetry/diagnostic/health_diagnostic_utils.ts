/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import * as YAML from 'yaml';
import { type Interval, intervalFromDate } from '@kbn/task-manager-plugin/server/lib/intervals';
import {
  Action,
  type HealthDiagnosticQuery,
  type HealthDiagnosticQueryStats,
} from './health_diagnostic_service.types';

export function shouldExecute(startDate: Date, endDate: Date, interval: Interval): boolean {
  const nextDate = intervalFromDate(startDate, interval);
  return nextDate !== undefined && nextDate < endDate;
}

export function parseDiagnosticQueries(input: unknown): HealthDiagnosticQuery[] {
  return YAML.parseAllDocuments(input as string).map((doc) => {
    return doc.toJSON() as HealthDiagnosticQuery;
  });
}

export function fieldNames<T>(documents: T): string[] {
  const result: Set<string> = new Set();

  const traverse = (obj: T, path: string) => {
    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        traverse(obj[0], `${path}[]`);
      } else {
        result.add(`${path}[]`);
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        traverse(value, path ? `${path}.${key}` : key);
      }
    } else {
      result.add(path);
    }
  };

  traverse(documents, '');

  return Array.from(result);
}

export function emptyStat(name: string, now: Date): HealthDiagnosticQueryStats {
  return {
    name,
    started: now.toISOString(),
    traceId: randomUUID(),
    finished: new Date().toISOString(),
    numDocs: 0,
    passed: false,
    fieldNames: [],
  };
}

export async function applyFilterlist(
  data: unknown[],
  rules: Record<string, Action>,
  salt: string
): Promise<unknown[]> {
  const filteredResult: unknown[] = [];

  const applyFilterToDoc = async (doc: unknown): Promise<Record<string, unknown>> => {
    const filteredDoc: Record<string, unknown> = {};
    for (const path of Object.keys(rules)) {
      const keys = path.split('.');
      await processPath(doc, filteredDoc, keys, path, 0);
    }
    return filteredDoc;
  };

  const processPath = async (
    src: unknown,
    dst: Record<string, unknown>,
    keys: string[],
    fullPath: string,
    keyIndex: number
  ): Promise<void> => {
    if (keyIndex >= keys.length || !src || typeof src !== 'object') return;

    const key = keys[keyIndex];
    const srcObj = src as Record<string, unknown>;

    if (!Object.hasOwn(srcObj, key)) return;

    if (keyIndex === keys.length - 1) {
      const value = srcObj[key];
      dst[key] = rules[fullPath] === Action.MASK ? await maskValue(String(value), salt) : value;
    } else {
      const nextValue = srcObj[key];

      if (Array.isArray(nextValue)) {
        if (!dst[key]) {
          dst[key] = [];
        }
        const dstArray = dst[key] as unknown[];

        for (let i = 0; i < nextValue.length; i++) {
          const item = nextValue[i];
          if (item && typeof item === 'object') {
            if (!dstArray[i]) {
              dstArray[i] = {};
            }
            await processPath(
              item,
              dstArray[i] as Record<string, unknown>,
              keys,
              fullPath,
              keyIndex + 1
            );
          }
        }
      } else if (nextValue && typeof nextValue === 'object') {
        dst[key] ??= {};
        await processPath(
          nextValue,
          dst[key] as Record<string, unknown>,
          keys,
          fullPath,
          keyIndex + 1
        );
      }
    }
  };

  for (const doc of data) {
    if (Array.isArray(doc)) {
      const docs = doc as unknown[];
      const result = await Promise.all(
        docs.map((d) => {
          return applyFilterToDoc(d);
        })
      );
      filteredResult.push(result);
    } else {
      filteredResult.push(await applyFilterToDoc(doc));
    }
  }

  return filteredResult;
}

async function maskValue(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

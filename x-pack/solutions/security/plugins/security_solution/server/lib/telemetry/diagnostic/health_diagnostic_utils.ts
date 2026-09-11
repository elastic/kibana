/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { type Interval, intervalFromDate } from '@kbn/task-manager-plugin/server/lib/intervals';
import {
  Action,
  type HealthDiagnosticQuery,
  type HealthDiagnosticQueryStats,
} from './health_diagnostic_service.types';
import { unflatten } from '../helpers';
import type { AnyObject, Nullable } from '../types';
import { generateDEK, encryptDEKWithRSA, encryptField, encryptDocumentAsJson } from './encryption';

export function shouldExecute(startDate: Date, endDate: Date, interval: Interval): boolean {
  const nextDate = intervalFromDate(startDate, interval);
  return nextDate !== undefined && nextDate < endDate;
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

export const emptyStat = (
  name: string,
  now: Date,
  descriptorVersion: number
): HealthDiagnosticQueryStats => ({
  name,
  started: now.toISOString(),
  traceId: randomUUID(),
  finished: new Date().toISOString(),
  numDocs: 0,
  passed: false,
  fieldNames: [],
  descriptorVersion,
  status: 'failed',
});

export async function applyFilterlist(
  data: unknown[],
  rules: Record<string, Action>,
  salt: string,
  query?: { encryptionKeyId?: string; encryptDocument?: true },
  encryptionPublicKeys?: Record<string, string>
): Promise<unknown[]> {
  const filteredResult: unknown[] = [];

  const needsDEK =
    query?.encryptDocument === true ||
    Object.values(rules).some((action) => action === Action.ENCRYPT);
  let dek: Nullable<Buffer>;
  let encryptedDEK: Nullable<Buffer>;
  let keyId: string | undefined;

  if (needsDEK) {
    if (!query?.encryptionKeyId) {
      throw new Error('encryptionKeyId is required when filterlist contains encrypt actions');
    }
    if (!encryptionPublicKeys || !encryptionPublicKeys[query.encryptionKeyId]) {
      throw new Error(`Public key not found for encryptionKeyId: ${query.encryptionKeyId}`);
    }

    keyId = query.encryptionKeyId;
    const publicKey = encryptionPublicKeys[keyId];
    dek = generateDEK();
    encryptedDEK = encryptDEKWithRSA(dek, publicKey);
  }

  const applyFilterToDoc = async (doc: unknown): Promise<Record<string, unknown>> => {
    const filteredDoc: Record<string, unknown> = {};
    for (const path of Object.keys(rules)) {
      const keys = path.split('.');
      await processPath(doc, filteredDoc, keys, path, 0);
    }
    return filteredDoc;
  };

  const processFieldValue = async (value: unknown, action: Action): Promise<unknown> => {
    if (action === Action.MASK) {
      return maskValue(String(value), salt);
    } else if (action === Action.ENCRYPT) {
      if (!dek || !encryptedDEK || !keyId) {
        throw new Error('Encryption configuration not initialized');
      }
      return encryptField(String(value), dek, encryptedDEK, keyId);
    } else if (action === Action.KEEP) {
      return value;
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  };

  const processArrayField = async (
    nextValue: unknown[],
    dst: Record<string, unknown>,
    key: string,
    keys: string[],
    fullPath: string,
    keyIndex: number
  ): Promise<void> => {
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
      const action = rules[fullPath];
      dst[key] = await processFieldValue(value, action);
    } else {
      const nextValue = srcObj[key];

      if (Array.isArray(nextValue)) {
        await processArrayField(nextValue, dst, key, keys, fullPath, keyIndex);
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

  if (query?.encryptDocument === true) {
    if (!dek || !encryptedDEK || !keyId) {
      throw new Error('Encryption configuration not initialized');
    }
    const hasRules = Object.keys(rules).length > 0;
    const result: string[] = [];
    for (const rawDoc of data) {
      const doc = unflatten(rawDoc as AnyObject);
      const subDoc = hasRules ? await applyFilterToDoc(doc) : doc;
      result.push(encryptDocumentAsJson(subDoc, dek, encryptedDEK, keyId));
    }
    dek.fill(0);
    return result;
  }

  for (const rawDoc of data) {
    const doc = unflatten(rawDoc as AnyObject);
    filteredResult.push(await applyFilterToDoc(doc));
  }

  dek?.fill(0);
  return filteredResult;
}

/**
 * Merges two query arrays with v2 taking precedence on `id` conflicts.
 * Queries without an `id` (ParseFailureQuery with no id field) are always
 * included — they will be reported as skipped at execution time.
 */
export const mergeByPriority = (
  v1Queries: HealthDiagnosticQuery[],
  v2Queries: HealthDiagnosticQuery[]
): HealthDiagnosticQuery[] => {
  const map = new Map<string, HealthDiagnosticQuery>();
  const idless: HealthDiagnosticQuery[] = [];

  for (const q of [...v1Queries, ...v2Queries]) {
    const id = (q as { id?: string }).id;
    if (id !== undefined) {
      map.set(id, q); // v2 entries overwrite v1 for the same id
    } else {
      idless.push(q);
    }
  }

  return [...map.values(), ...idless];
};

async function maskValue(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

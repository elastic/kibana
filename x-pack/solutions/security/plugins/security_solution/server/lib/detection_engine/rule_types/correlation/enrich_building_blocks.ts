/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const ENRICHMENT_FIELDS = [
  'process.name',
  'process.executable',
  'process.pid',
  'process.args',
  'process.parent.name',
  'process.parent.executable',
  'source.ip',
  'source.port',
  'destination.ip',
  'destination.port',
  'user.name',
  'user.domain',
  'user.id',
  'host.name',
  'host.os.name',
  'host.ip',
  'event.action',
  'event.category',
  'event.module',
  'event.dataset',
  'event.outcome',
  'file.name',
  'file.path',
  'file.hash.sha256',
  'url.full',
  'url.domain',
  'dns.question.name',
  'network.protocol',
  'network.direction',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'kibana.alert.reason',
  'kibana.alert.original_time',
  '@timestamp',
] as const;

const MGET_BATCH_SIZE = 5000;

export const fetchContributingAlerts = async (
  esClient: ElasticsearchClient,
  alertIds: Set<string>,
  alertsIndices: string[]
): Promise<Map<string, Record<string, unknown>>> => {
  const results = new Map<string, Record<string, unknown>>();
  if (alertIds.size === 0) return results;

  const idArray = [...alertIds];
  for (let offset = 0; offset < idArray.length; offset += MGET_BATCH_SIZE) {
    const batch = idArray.slice(offset, offset + MGET_BATCH_SIZE);
    const response = await esClient.mget({
      docs: batch.map((id) => ({
        _id: id,
        _index: alertsIndices[0],
        _source: ENRICHMENT_FIELDS as unknown as string[],
      })),
    });

    for (const doc of response.docs) {
      if ('found' in doc && doc.found && doc._source) {
        results.set(doc._id, doc._source as Record<string, unknown>);
      }
    }
  }

  return results;
};

export const extractEnrichmentFields = (doc: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const field of ENRICHMENT_FIELDS) {
    const value = getNestedValue(doc, field);
    if (value !== undefined) {
      setNestedValue(result, field, value);
    }
  }
  return result;
};

/**
 * Computes the intersection of enrichment fields across multiple contributing alert
 * documents. Only fields where ALL documents have the same value (deep equality)
 * are kept — this ensures the shell alert only carries fields common to every
 * contributing alert.
 */
export const computeShellEnrichment = (
  alertDocs: Array<Record<string, unknown>>
): Record<string, unknown> => {
  if (alertDocs.length === 0) return {};
  if (alertDocs.length === 1) return extractEnrichmentFields(alertDocs[0]);

  const base = extractEnrichmentFields(alertDocs[0]);
  const result: Record<string, unknown> = {};

  for (const field of ENRICHMENT_FIELDS) {
    const baseValue = getNestedValue(base, field);
    if (baseValue !== undefined) {
      const allMatch = alertDocs.slice(1).every((doc) => {
        const value = getNestedValue(doc, field);
        return value !== undefined && deepEqual(baseValue, value);
      });

      if (allMatch) {
        setNestedValue(result, field, baseValue);
      }
    }
  }

  return result;
};

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
};

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    );
  }
  return false;
};

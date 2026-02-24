/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Alert vectorization utilities for the Hybrid Alert Deduplication system.
 *
 * Converts alert content into numerical feature vectors using n-gram hashing
 * and field-specific vector spaces, then computes cosine distance for similarity.
 *
 * Ported from https://github.com/elastic/alert-clustering
 */

import murmurhash from 'murmurhash';

import { TRIAGE_FIELDS } from './types';
import type { AlertDocument } from './types';
import { getVal } from './utils';

// ============================================================
// Hashing
// ============================================================

/**
 * Compute a MurmurHash3 (32-bit) for a given string feature.
 * The Python version uses mmh3.hash64 but only uses the first u64;
 * 32-bit is sufficient for `hash % bucketSize` offsets.
 */
export const getHash = (feature: string): number => {
  // murmurhash v3 returns an unsigned 32-bit integer
  return murmurhash.v3(feature) >>> 0;
};

// ============================================================
// N-grams
// ============================================================

/**
 * Generate character n-grams from a string.
 * If the string is shorter than the n-gram size, the whole string is used.
 */
export const getNgrams = (data: string, ngramSize: number): Set<string> => {
  const ngrams = new Set<string>();
  for (let i = 0; i <= data.length - ngramSize; i++) {
    ngrams.add(data.slice(i, i + ngramSize));
  }
  if (ngrams.size === 0) {
    ngrams.add(data);
  }
  return ngrams;
};

// ============================================================
// Field → vector conversion
// ============================================================

/**
 * Convert a field value into a fixed-size vector using n-gram hashing.
 * Each n-gram is hashed and mapped to a bucket; the bucket value is
 * incremented by `1 / numNgrams` to produce a normalized distribution.
 */
export const vectorFromVal = (val: unknown, bucketSize = 32): number[] => {
  const vector = new Array<number>(bucketSize).fill(0);

  if (val == null) {
    return vector;
  }

  const str = String(val).slice(0, 256).toLowerCase();
  const ngrams = getNgrams(str, 4);
  const magnitude = 1 / ngrams.size;

  for (const ngram of ngrams) {
    const index = getHash(ngram) % bucketSize;
    vector[index] += magnitude;
  }

  return vector;
};

// ============================================================
// Alert field extraction for unknown fields
// ============================================================

/** Fields that are non-ECS but should still be kept */
const NON_ECS_TO_KEEP = new Set(['Target', 'Ext', 'Effective_process']);

/** Top-level keys to skip entirely */
const TOP_LEVEL_SKIP_FIELDS = new Set([
  'threat',
  'event',
  '@timestamp',
  'agent',
  'ecs',
  'signal_id',
  'data_stream',
  'elastic',
  'version',
  'rule',
  'host',
  'cloud',
  'license',
  'channel',
  'cluster_uuid',
  'cluster_name',
  'location',
]);

/** Full dotted field names to skip */
const FULL_FIELDS_TO_SKIP = new Set([
  'process.Ext.ancestry',
  'process.args',
  'process.parent.args',
]);

/** Field name suffixes to skip */
const ENDSWITH_FIELDS_TO_SKIP = ['.pid', '.entity_id', '_time', '.id'];

/**
 * Recursively extract (field, value) leaf pairs from an alert document,
 * excluding known noisy or non-discriminative fields.
 */
export const getFieldsFromAlert = (data: unknown, parentKey?: string): Array<[string, unknown]> => {
  const items: Array<[string, unknown]> = [];

  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;

      // Skip non-ECS capitalized keys (e.g., "Events", "Responses")
      if (
        key[0] === key[0].toUpperCase() &&
        key[0] !== key[0].toLowerCase() &&
        !NON_ECS_TO_KEEP.has(key)
      ) {
        continue;
      }

      // Skip top-level noisy fields
      if (!parentKey && TOP_LEVEL_SKIP_FIELDS.has(key)) {
        continue;
      }

      // Skip specific full field names
      if (FULL_FIELDS_TO_SKIP.has(newKey)) {
        continue;
      }

      // Skip fields ending with certain suffixes
      if (ENDSWITH_FIELDS_TO_SKIP.some((suffix) => newKey.endsWith(suffix))) {
        continue;
      }

      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        // Recurse into nested objects
        items.push(...getFieldsFromAlert(value, newKey));
      } else {
        // Leaf value
        items.push([newKey, value]);
      }
    }
  } else {
    // Non-dict data at this level
    if (parentKey) {
      items.push([parentKey, data]);
    }
  }

  return items;
};

// ============================================================
// Generic alert feature vector
// ============================================================

/**
 * Compute a generic feature vector for an alert.
 *
 * The vector has two sections:
 * 1. **Known fields**: Each triage field gets `fieldSizeKnown` buckets at a
 *    fixed position so that the same field always maps to the same vector region.
 * 2. **Unknown fields**: All other (non-triage) fields are hashed by their
 *    field name to one of `unknownVectorCount` slots of `fieldSize` buckets.
 *
 * This approach works for any kind of ECS data without requiring a fixed schema.
 */
export const getGenericAlertFeatureVector = (alert: AlertDocument, weighted = false): number[] => {
  const fieldSizeKnown = 32; // buckets per known field
  const fieldSize = 8; // buckets per unknown field
  const unknownVectorCount = 8; // number of slots for unknown fields
  const knownFieldCount = TRIAGE_FIELDS.length;

  const featureVector: number[] = [];

  // Section 1: Known triage fields
  for (const field of TRIAGE_FIELDS) {
    const v = vectorFromVal(getVal(alert, field), fieldSizeKnown);
    featureVector.push(...v);
  }

  // Section 2: Unknown fields
  if (unknownVectorCount > 0) {
    // Initialize unknown section with zeros
    featureVector.push(...new Array(fieldSize * unknownVectorCount).fill(0));

    const kvPairs = getFieldsFromAlert(alert);
    for (const [k, v] of kvPairs) {
      if ((TRIAGE_FIELDS as readonly string[]).includes(k)) {
        continue;
      }
      const fieldVector = vectorFromVal(v, fieldSize);
      const index = getHash(k) % unknownVectorCount;

      // Add this field's vector into the correct position
      const start = index * fieldSize + knownFieldCount * fieldSizeKnown;
      for (let i = 0; i < fieldSize; i++) {
        featureVector[start + i] += fieldVector[i];
      }
    }
  }

  return featureVector;
};

// ============================================================
// Cosine distance
// ============================================================

/**
 * Compute the cosine distance between two vectors.
 * Returns a value between 0 (identical) and 2 (opposite).
 *
 * cosine_distance = 1 - cosine_similarity
 * where cosine_similarity = (A · B) / (|A| * |B|)
 */
export const cosineDistance = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 1; // Maximum distance if either vector is zero
  }

  const similarity = dotProduct / (normA * normB);
  return 1 - similarity;
};

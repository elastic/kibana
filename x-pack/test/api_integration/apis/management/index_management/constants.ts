/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_BASE_PATH = '/api/index_management';
export const INTERNAL_API_BASE_PATH = '/internal/index_management';

export const INDEX_PATTERNS = ['test*'];

const expectedIndexKeys = [
  'health',
  'hidden',
  'status',
  'name',
  'uuid',
  'primary',
  'replica',
  'documents',
  'documents_deleted',
  'size',
  'primary_size',
  'isFrozen',
  'aliases',
  // Cloud disables CCR, so wouldn't expect follower indices.
  'isFollowerIndex', // data enricher
  'ilm', // data enricher
  'isRollupIndex', // data enricher
];
// We need to sort the keys before comparing then, because race conditions
// can cause enrichers to register in non-deterministic order.
export const sortedExpectedIndexKeys = expectedIndexKeys.sort();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_BASE_PATH = '/api/rollup';
export const INDEX_PATTERNS_EXTENSION_BASE_PATH = '/api/index_patterns';
export const ROLLUP_INDEX_NAME = 'rollup_index';
export const INDEX_TO_ROLLUP_MAPPINGS = {
  properties: {
    testTotalField: { type: 'long' },
    testTagField: { type: 'keyword' },
    testCreatedField: { type: 'date' },
  },
};

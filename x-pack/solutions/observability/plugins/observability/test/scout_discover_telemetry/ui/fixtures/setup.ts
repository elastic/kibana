/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Scout's import client appends `.json`, so a directory path resolves to
// `discover.json` (a different archive). Load the files the FTR directory load covers.
export const DISCOVER_KBN_ARCHIVES = [
  'src/platform/test/functional/fixtures/kbn_archiver/discover/context_awareness.json',
  'src/platform/test/functional/fixtures/kbn_archiver/discover/visual_regression.json',
  'src/platform/test/functional/fixtures/kbn_archiver/discover/session_with_control.json',
];

export const ES_ARCHIVES = [
  'src/platform/test/functional/fixtures/es_archiver/logstash_functional',
  'src/platform/test/functional/fixtures/es_archiver/discover/context_awareness',
];

export const DISCOVER_TIME_DEFAULTS = JSON.stringify({
  from: '2024-06-10T14:00:00.000Z',
  to: '2024-06-10T16:30:00.000Z',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutWorkerFixtures } from '@kbn/scout-oblt';

// Scout's import client appends `.json`, so a directory path resolves to
// `discover.json` (a different archive). Load the files the FTR directory load covers.
const DISCOVER_KBN_ARCHIVES = [
  'src/platform/test/functional/fixtures/kbn_archiver/discover/context_awareness.json',
  'src/platform/test/functional/fixtures/kbn_archiver/discover/visual_regression.json',
  'src/platform/test/functional/fixtures/kbn_archiver/discover/session_with_control.json',
];
const LOGSTASH_ES_ARCHIVE = 'src/platform/test/functional/fixtures/es_archiver/logstash_functional';
const CONTEXT_AWARENESS_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/discover/context_awareness';

const FROM = '2024-06-10T14:00:00.000Z';
const TO = '2024-06-10T16:30:00.000Z';

export async function loadDiscoverTelemetryData({
  esArchiver,
  kbnClient,
}: Pick<ScoutWorkerFixtures, 'esArchiver' | 'kbnClient'>) {
  await esArchiver.loadIfNeeded(LOGSTASH_ES_ARCHIVE);
  await esArchiver.loadIfNeeded(CONTEXT_AWARENESS_ES_ARCHIVE);
  for (const archive of DISCOVER_KBN_ARCHIVES) {
    await kbnClient.importExport.load(archive);
  }
  await kbnClient.uiSettings.update({
    'timepicker:timeDefaults': `{ "from": "${FROM}", "to": "${TO}"}`,
  });
}

export async function unloadDiscoverTelemetryData({
  kbnClient,
}: Pick<ScoutWorkerFixtures, 'kbnClient'>) {
  for (const archive of DISCOVER_KBN_ARCHIVES) {
    await kbnClient.importExport.unload(archive);
  }
  await kbnClient.uiSettings.unset('timepicker:timeDefaults');
}

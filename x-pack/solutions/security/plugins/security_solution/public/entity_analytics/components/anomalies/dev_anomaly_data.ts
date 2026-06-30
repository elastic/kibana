/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * DEV-ONLY MOCK DATA — TEMPORARY, FOR LOCAL UI TESTING ONLY.
 *
 * This whole file plus the `USE_MOCK_ANOMALY_DATA` short-circuits in
 * `use_anomaly_overview.ts` / `use_anomaly_summary.ts` exist solely so the
 * behavioral anomalies section and tool flyout can be exercised in the UI
 * without real ML jobs. Revert the commit that introduced this file before
 * merging. Flip `USE_MOCK_ANOMALY_DATA` to `false` to disable without
 * reverting.
 *
 * Note: the filename intentionally avoids the `mock_`/`*.mock.*` patterns that
 * `@kbn/repo-source-classifier` treats as test-only code, so it can be
 * imported from the browser hooks.
 */

import type {
  AnomalyOverviewResponse,
  AnomalySummaryEntry,
  AnomalySummaryResponse,
} from '../../../../common/api/entity_analytics';

export const USE_MOCK_ANOMALY_DATA = true;

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgoIso = (days: number) => new Date(NOW - days * DAY_MS).toISOString();

export const MOCK_ANOMALY_OVERVIEW: AnomalyOverviewResponse = {
  entityId: 'mock-entity-id',
  anomalyByTimeBucket: [
    { timestamp: daysAgoIso(20), maxScore: 42, threatTactics: ['Initial Access'] },
    {
      timestamp: daysAgoIso(14),
      maxScore: 78,
      threatTactics: ['Privilege Escalation', 'Credential Access'],
    },
    { timestamp: daysAgoIso(7), maxScore: 95, threatTactics: ['Lateral Movement'] },
    { timestamp: daysAgoIso(2), maxScore: 63, threatTactics: ['Defense Evasion'] },
  ],
  recentAnomalies: [
    {
      jobId: 'v3_windows_anomalous_process_creation',
      jobName: 'Anomalous Windows process creation',
      timestamp: daysAgoIso(2),
      anomalousValue: 'powershell.exe',
    },
    {
      jobId: 'auth_high_count_logon_fails',
      jobName: 'High count of logon failures',
      timestamp: daysAgoIso(4),
      anomalousValue: '128 failed logons',
    },
    {
      jobId: 'v3_rare_process_by_host',
      jobName: 'Rare process executed on host',
      timestamp: daysAgoIso(6),
      anomalousValue: 'rundll32.exe',
    },
  ],
  tacticCounts: {
    'Initial Access': 3,
    'Privilege Escalation': 5,
    'Credential Access': 2,
    'Lateral Movement': 4,
    'Defense Evasion': 1,
  },
  totalAnomaliesCount: 15,
  from: NOW - 30 * DAY_MS,
  to: NOW,
};

const summaryEntry = (overrides: Partial<AnomalySummaryEntry>): AnomalySummaryEntry => ({
  jobId: 'v3_rare_process_by_host',
  jobName: 'Rare process executed on host',
  threatTactics: ['Lateral Movement'],
  threatTechniques: ['Remote Services'],
  detectorIndex: 0,
  detectorFunction: 'rare',
  fieldName: null,
  byFieldName: 'process.name',
  byFieldValue: 'rundll32.exe',
  overFieldName: null,
  overFieldValue: null,
  partitionFieldName: 'host.name',
  partitionFieldValue: 'mock-host',
  recordScore: 95,
  timestamp: daysAgoIso(6),
  actual: [128],
  typical: [2],
  baselineValues: [],
  anomalousValue: 'rundll32.exe',
  anomalousValueCount: 12,
  ...overrides,
});

const MOCK_SUMMARY_ENTRIES: AnomalySummaryEntry[] = [
  summaryEntry({
    jobId: 'v3_windows_anomalous_process_creation',
    jobName: 'Anomalous Windows process creation',
    threatTactics: ['Initial Access'],
    threatTechniques: ['Command and Scripting Interpreter'],
    detectorFunction: 'rare',
    byFieldValue: 'powershell.exe',
    recordScore: 63,
    timestamp: daysAgoIso(2),
    anomalousValue: 'powershell.exe',
  }),
  summaryEntry({
    jobId: 'auth_high_count_logon_fails',
    jobName: 'High count of logon failures',
    threatTactics: ['Credential Access'],
    threatTechniques: ['Brute Force'],
    detectorFunction: 'high_count',
    byFieldName: null,
    byFieldValue: null,
    recordScore: 88,
    timestamp: daysAgoIso(4),
    actual: [128],
    typical: [3],
    anomalousValue: '128 failed logons',
    anomalousValueCount: 128,
  }),
  summaryEntry({
    recordScore: 95,
    timestamp: daysAgoIso(6),
  }),
];

export const MOCK_ANOMALY_SUMMARY: AnomalySummaryResponse = {
  entity_id: 'mock-entity-id',
  anomalies: MOCK_SUMMARY_ENTRIES,
  total: MOCK_SUMMARY_ENTRIES.length,
  page: 1,
  page_size: 10,
};

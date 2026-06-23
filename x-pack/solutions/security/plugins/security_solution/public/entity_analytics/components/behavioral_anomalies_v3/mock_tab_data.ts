/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';
import { MOCK_JOB_TO_TACTICS } from '../behavioral_anomalies/mitre/mock_anomaly_tactics';
import { MITRE_TACTIC_NAMES } from '../behavioral_anomalies/mitre/tactics';
import { MOCK_ANOMALY_V3_TOTAL_COUNT } from './mock_data';
import type {
  BehavioralAnomalyV3TableRow,
  HeatmapRecordV3,
  MockMlJobV3,
  UnderlyingEventRefV3,
  ViewByFieldV3,
} from './types';

const HOUR_MS = 60 * 60 * 1000;

/** Default left-tab time range — drives the EuiSuperDatePicker initial value. */
export const DEFAULT_TIMELINE_RANGE_V3 = { from: 'now-30d', to: 'now' } as const;

/**
 * Returns the ML severity-bucket threshold (one of `ML_ANOMALY_THRESHOLD.*`)
 * an anomaly score belongs to. The BA-v.3 tab uses this to match scores
 * against the user's selection in the Anomaly score filter (whose options
 * are keyed on the same threshold values via `SeverityOptionV3.val`).
 */
export const getSeverityBucketV3 = (score: number): number => {
  if (score >= ML_ANOMALY_THRESHOLD.CRITICAL) return ML_ANOMALY_THRESHOLD.CRITICAL;
  if (score >= ML_ANOMALY_THRESHOLD.MAJOR) return ML_ANOMALY_THRESHOLD.MAJOR;
  if (score >= ML_ANOMALY_THRESHOLD.MINOR) return ML_ANOMALY_THRESHOLD.MINOR;
  if (score >= ML_ANOMALY_THRESHOLD.WARNING) return ML_ANOMALY_THRESHOLD.WARNING;
  return ML_ANOMALY_THRESHOLD.LOW;
};

/**
 * Convenience predicate factory — returns `true` when `allowed` is `undefined`
 * (caller wants no filter) or the row's score falls into one of the allowed
 * severity buckets. Centralising the rule here keeps the swim lane, attack
 * chain, and Anomalies table from drifting in how they apply the filter.
 */
const matchesSeverity = (
  score: number,
  allowed: ReadonlySet<number> | undefined
): boolean => allowed === undefined || allowed.has(getSeverityBucketV3(score));

export const MOCK_ML_JOBS_V3: MockMlJobV3[] = [
  { id: 'auth_high_count_logon', displayName: 'Failed authentication spike' },
  { id: 'suspicious_login_after_hours', displayName: 'Unusual login hour' },
  { id: 'rare_destination_country', displayName: 'New country login' },
  { id: 'unusual_process_execution', displayName: 'Unusual process execution' },
  { id: 'high_source_ip_count', displayName: 'High source IP count' },
  { id: 'rare_user_agent', displayName: 'Rare user agent' },
  { id: 'dns_tunneling_score', displayName: 'DNS tunneling score' },
  { id: 'privilege_escalation_host', displayName: 'Privilege escalation (host)' },
  { id: 'data_exfil_volume', displayName: 'Data exfiltration volume' },
  { id: 'lateral_movement_score', displayName: 'Lateral movement score' },
  { id: 'oauth_token_anomaly', displayName: 'OAuth token anomaly' },
  { id: 'cloud_api_call_rate', displayName: 'Cloud API call rate' },
];

/*
 * Swim lane records are derived directly from `MOCK_ANOMALY_V3_TABLE_ROWS`
 * so the chart and the table stay perfectly in sync: every row in the table
 * produces one colored cell per tactic it maps to (using the row's actual
 * `anomalyScore` for the cell color and its `timestamp` for the x position).
 *
 * Sentinel rows: tactics that have no in-range anomalies still need to show
 * up on the Y-axis (otherwise the chart compresses to fewer rows than the
 * Y-axis labels list, and the rows visually misalign with the labels). For
 * each missing tactic we push a record at a timestamp just outside the
 * chart's xDomain so the heatmap registers the row in its yDomain but
 * doesn't draw a visible cell.
 *
 * Cleanup: this entire function (and the `MOCK_ANOMALY_V3_TABLE_ROWS`
 * mock-data source it draws from) lives inside `behavioral_anomalies_v3/`
 * and is deleted with the v.3 folder.
 */
export const getTimelineHeatmapRecordsV3 = (
  rowKeys: string[],
  yAccessor: ViewByFieldV3,
  timeRangeMs: { from: number; to: number },
  allowedSeverityThresholds?: ReadonlySet<number>
): HeatmapRecordV3[] => {
  const span = Math.max(0, timeRangeMs.to - timeRangeMs.from);
  if (span === 0) {
    return [];
  }
  const rowKeySet = new Set(rowKeys);
  const records: HeatmapRecordV3[] = [];
  const presentRowKeys = new Set<string>();

  for (const row of MOCK_ANOMALY_V3_TABLE_ROWS) {
    if (row.timestamp < timeRangeMs.from || row.timestamp > timeRangeMs.to) {
      continue;
    }
    if (!matchesSeverity(row.anomalyScore, allowedSeverityThresholds)) {
      continue;
    }
    if (yAccessor === 'mitre_tactic') {
      // One cell per tactic the anomaly is mapped to. The heatmap then
      // groups cells into time buckets along the x-axis automatically.
      for (const tactic of row.mitreTactics) {
        if (!rowKeySet.has(tactic)) continue;
        records.push({
          '@timestamp': row.timestamp,
          record_score: row.anomalyScore,
          mitre_tactic: tactic,
        });
        presentRowKeys.add(tactic);
      }
    } else if (yAccessor === 'job_id') {
      if (!rowKeySet.has(row.jobId)) continue;
      records.push({
        '@timestamp': row.timestamp,
        record_score: row.anomalyScore,
        job_id: row.jobId,
      });
      presentRowKeys.add(row.jobId);
    }
  }

  // Fill in placeholder records for any rowKey that has no in-range data so
  // the heatmap renders an empty row instead of dropping the row entirely.
  // Placed at `from - 1` so the cell falls outside xDomain and isn't drawn.
  const sentinelTimestamp = timeRangeMs.from - 1;
  for (const rowKey of rowKeys) {
    if (presentRowKeys.has(rowKey)) continue;
    records.push({
      '@timestamp': sentinelTimestamp,
      record_score: 0,
      [yAccessor]: rowKey,
    } as HeatmapRecordV3);
  }

  return records;
};

export const getTimelineRowKeysV3 = (viewBy: ViewByFieldV3): string[] => {
  if (viewBy === 'job_id') {
    return MOCK_ML_JOBS_V3.map((job) => job.id);
  }
  if (viewBy === 'mitre_tactic') {
    return [...MITRE_TACTIC_NAMES];
  }
  return ['john.doe', 'server-01', '10.0.0.12', '192.168.1.44', 'winlogon.exe', 'sshd'];
};

export const getJobDisplayNameV3 = (jobId: string): string =>
  MOCK_ML_JOBS_V3.find((job) => job.id === jobId)?.displayName ?? jobId;

interface TableRowTemplate
  extends Omit<
    BehavioralAnomalyV3TableRow,
    'id' | 'timestamp' | 'underlyingEvents' | 'mitreTactics'
  > {
  daysAgo: number;
  hour: number;
  /** Mock event ids (1-3 per template) used to scope Add to case / timeline / Discover. */
  eventIds: string[];
}

const MOCK_EVENT_INDEX = 'logs-*';

/*
 * The 8 template rows below are deliberately tuned so that — after
 * `buildTableRows` sorts by timestamp desc — page 1 (10 rows) contains at
 * least one example of every ML severity bucket:
 *   LOW (<3) · WARNING (3–25) · MINOR (25–50) · MAJOR (50–75) · CRITICAL (75+)
 * Padded rows generated below get timestamps strictly older than any template
 * row, so templates always own the top of the table regardless of count.
 */
const TABLE_ROWS_TEMPLATE: TableRowTemplate[] = [
  {
    jobId: 'rare_destination_country',
    jobDisplayName: 'New country login',
    daysAgo: 4,
    hour: 22,
    baseline: 'United States',
    anomaly: 'Italy',
    anomalyScore: 32.4,
    detectorIndex: 0,
    entities: { 'user.name': 'john.doe' },
    // No spike chip — this is a categorical first-time-seen value rather
    // than a numeric multiplier.
    explainer: [
      {
        text: 'Detects rare values for destination.geo.country_name — the user signed in from a country never seen for this account in the last 30 days. First sign-in from Italy in the last 90 days; 2 prior new-country sign-ins (Spain, Germany) in the last 30 days.',
      },
    ],
    countOfSourceEvents: 1,
    keyFields: [
      'user.name=john.doe',
      'destination.geo.country_name=Italy',
      'source.ip=185.30.32.11',
    ],
    eventIds: ['evt-rare-country-1'],
  },
  {
    jobId: 'auth_high_count_logon',
    jobDisplayName: 'Failed authentication spike',
    daysAgo: 6,
    hour: 6,
    baseline: '~2 events/min',
    anomaly: '84 events/min',
    spike: '42x',
    anomalyScore: 92,
    detectorIndex: 0,
    entities: { 'user.name': 'john.doe' },
    // Mirrors the screenshot from the design spec — two spike chips,
    // "42×" then "12×-18×".
    explainer: [
      { text: 'Detects unusual spikes in failed authentication events — ' },
      { spike: '42x' },
      {
        text: ' the typical hourly rate for this user. 4th failed-auth spike for this account in the last 14 days; previous spikes peaked at ',
      },
      { spike: '12x-18x' },
      { text: '.' },
    ],
    countOfSourceEvents: 456,
    keyFields: ['user.id=xxx', 'host.id=xxx', 'source.ip=xxx'],
    eventIds: ['evt-auth-spike-1', 'evt-auth-spike-2', 'evt-auth-spike-3'],
  },
  {
    jobId: 'suspicious_login_after_hours',
    jobDisplayName: 'Unusual login hour',
    daysAgo: 5,
    hour: 9,
    baseline: '09:00–18:00',
    anomaly: '06:14',
    anomalyScore: 18.7,
    detectorIndex: 0,
    entities: { 'user.name': 'john.doe' },
    // Time-of-day rarity — no numeric multiplier to chip.
    explainer: [
      {
        text: "Detects login activity outside the user's typical 09:00–18:00 working hours. First off-hours sign-in for this account in the last 30 days.",
      },
    ],
    countOfSourceEvents: 1,
    keyFields: ['user.name=john.doe', 'host.name=server-01', 'source.ip=10.0.0.12'],
    eventIds: ['evt-login-hour-1'],
  },
  {
    jobId: 'unusual_process_execution',
    jobDisplayName: 'Unusual process execution',
    daysAgo: 3,
    hour: 14,
    baseline: 'powershell.exe',
    anomaly: 'certutil.exe',
    anomalyScore: 78.5,
    detectorIndex: 0,
    entities: { 'host.name': 'server-01' },
    explainer: [
      {
        text: 'Detects rarely-used binaries executing on the host — certutil.exe deviates from the baseline parent/child relationship. First execution of certutil.exe on this host in the last 60 days; 2 other rare-binary anomalies on this host in the last 30 days.',
      },
    ],
    countOfSourceEvents: 1,
    keyFields: ['host.name=server-01', 'process.name=certutil.exe', 'user.name=SYSTEM'],
    eventIds: ['evt-process-1', 'evt-process-2'],
  },
  {
    jobId: 'high_source_ip_count',
    jobDisplayName: 'High source IP count',
    daysAgo: 2,
    hour: 11,
    baseline: '~12 unique IPs',
    anomaly: '47 unique IPs',
    spike: '3.9x',
    anomalyScore: 71.2,
    detectorIndex: 0,
    entities: { 'source.ip': '10.0.0.12' },
    explainer: [
      { text: 'Detects a sharp increase in distinct source IPs targeting the entity — ' },
      { spike: '3.9x' },
      {
        text: ' the typical hourly distinct-IP count. 3rd surge above 30 unique IPs in the last 14 days for this destination.',
      },
    ],
    countOfSourceEvents: 1247,
    keyFields: [
      'destination.ip=10.0.0.12',
      'destination.port=443',
      'event.action=network_flow',
    ],
    eventIds: ['evt-ip-count-1', 'evt-ip-count-2'],
  },
  {
    jobId: 'data_exfil_volume',
    jobDisplayName: 'Data exfiltration volume',
    daysAgo: 1,
    hour: 19,
    baseline: '~120 MB/hour',
    anomaly: '890 MB/hour',
    spike: '7.4x',
    anomalyScore: 88.1,
    detectorIndex: 0,
    entities: { 'host.name': 'server-01' },
    explainer: [
      { text: 'Detects unusually large outbound transfer volume — ' },
      { spike: '7.4x' },
      {
        text: ' the typical hourly egress for the host. First transfer above 500 MB/hour for this host in the last 30 days.',
      },
    ],
    countOfSourceEvents: 832,
    keyFields: [
      'host.name=server-01',
      'destination.ip=203.0.113.42',
      'network.bytes=890MB',
    ],
    eventIds: ['evt-exfil-1', 'evt-exfil-2', 'evt-exfil-3'],
  },
  {
    jobId: 'lateral_movement_score',
    jobDisplayName: 'Lateral movement score',
    daysAgo: 7,
    hour: 16,
    baseline: '2 hosts',
    anomaly: '9 hosts',
    spike: '4.5x',
    anomalyScore: 1.4,
    detectorIndex: 0,
    entities: { 'host.name': 'server-01' },
    explainer: [
      { text: 'Detects an unusually broad set of internal hosts reached from the entity — ' },
      { spike: '4.5x' },
      {
        text: ' the typical fan-out. 2nd fan-out above 5 hosts for this entity in the last 30 days; 4 of the 9 hosts are new contacts.',
      },
    ],
    countOfSourceEvents: 234,
    keyFields: [
      'host.name=server-01',
      'user.name=svc-deploy',
      'destination.bytes=12.4MB',
    ],
    eventIds: ['evt-lateral-1', 'evt-lateral-2'],
  },
  {
    jobId: 'dns_tunneling_score',
    jobDisplayName: 'DNS tunneling score',
    daysAgo: 8,
    hour: 13,
    baseline: '~30 queries/min',
    anomaly: '210 queries/min',
    spike: '7x',
    anomalyScore: 76.4,
    detectorIndex: 0,
    entities: { 'destination.ip': '192.168.1.44' },
    explainer: [
      { text: 'Detects DNS query patterns consistent with tunneling — sustained ' },
      { spike: '7x' },
      {
        text: ' query-rate spike to a single destination. First sustained tunneling-pattern spike to 192.168.1.44 in the last 30 days.',
      },
    ],
    countOfSourceEvents: 4210,
    keyFields: [
      'destination.ip=192.168.1.44',
      'dns.question.name=*.suspicious.com',
      'source.ip=10.0.0.12',
    ],
    eventIds: ['evt-dns-1'],
  },
];

/** Returns the MITRE tactics mapped to the supplied job id (defensive copy). */
const tacticsForJob = (jobId: string): string[] => {
  const tactics = MOCK_JOB_TO_TACTICS[jobId];
  return tactics ? [...tactics] : [];
};

const buildUnderlyingEvents = (eventIds: string[], suffix: string): UnderlyingEventRefV3[] =>
  eventIds.map((eventId) => ({ _id: `${eventId}-${suffix}`, _index: MOCK_EVENT_INDEX }));

const buildTableRows = (): BehavioralAnomalyV3TableRow[] => {
  const now = Date.now();
  const rows: BehavioralAnomalyV3TableRow[] = TABLE_ROWS_TEMPLATE.map((template, index) => ({
    id: `anomaly-row-v3-${index}`,
    jobId: template.jobId,
    jobDisplayName: template.jobDisplayName,
    timestamp: now - template.daysAgo * 24 * HOUR_MS + template.hour * HOUR_MS,
    baseline: template.baseline,
    anomaly: template.anomaly,
    spike: template.spike,
    anomalyScore: template.anomalyScore,
    detectorIndex: template.detectorIndex,
    entities: template.entities,
    explainer: template.explainer,
    countOfSourceEvents: template.countOfSourceEvents,
    keyFields: template.keyFields,
    mitreTactics: tacticsForJob(template.jobId),
    underlyingEvents: buildUnderlyingEvents(template.eventIds, `v3-${index}`),
  }));

  // Padded rows are stamped strictly older than any template row (max template
  // is 8 days ago) so the 8 templates always occupy ranks 1-8 of the
  // descending-timestamp sort — guarantees page 1 reflects the curated mix.
  const PADDED_ROW_FLOOR_DAYS = 12;
  let counter = rows.length;
  while (rows.length < MOCK_ANOMALY_V3_TOTAL_COUNT) {
    const template = TABLE_ROWS_TEMPLATE[counter % TABLE_ROWS_TEMPLATE.length];
    const padOffsetIndex = counter - TABLE_ROWS_TEMPLATE.length;
    rows.push({
      id: `anomaly-row-v3-${counter}`,
      jobId: template.jobId,
      jobDisplayName: template.jobDisplayName,
      timestamp:
        now - (PADDED_ROW_FLOOR_DAYS + padOffsetIndex) * 24 * HOUR_MS - (padOffsetIndex % 7) * HOUR_MS,
      baseline: template.baseline,
      anomaly: template.anomaly,
      spike: template.spike,
      // Padded-row scores are deliberately kept within the bucket of their
      // source template (clamped to >= 5) since page 1 already covers all
      // severity buckets via the template rows.
      anomalyScore: Math.max(5, template.anomalyScore - (counter % 7) * 3),
      detectorIndex: template.detectorIndex,
      entities: template.entities,
      // Padded rows inherit the template's explainer / key-fields content so
      // the expanded-row design stays meaningful as the user pages back.
      explainer: template.explainer,
      countOfSourceEvents: template.countOfSourceEvents,
      keyFields: template.keyFields,
      mitreTactics: tacticsForJob(template.jobId),
      underlyingEvents: buildUnderlyingEvents(template.eventIds, `v3-${counter}`),
    });
    counter += 1;
  }

  return rows.sort((a, b) => b.timestamp - a.timestamp);
};

export const MOCK_ANOMALY_V3_TABLE_ROWS = buildTableRows();

export const DEFAULT_PAGE_SIZE_V3 = 10;

export const PAGE_SIZE_OPTIONS_V3 = [10, 25, 50];

/*
 * Per-tactic counts are derived from the same `MOCK_ANOMALY_V3_TABLE_ROWS`
 * the Anomalies table renders, attributing every anomaly to its **first**
 * mapped MITRE tactic. That makes the sum across all tactics exactly equal
 * to `MOCK_ANOMALY_V3_TOTAL_COUNT`, so the Attack chain's per-tactic chips
 * line up with the "Showing 1-N of N anomalies" total in the table.
 *
 * The static `MOCK_*_V3` constants below are the "all-time" view used by
 * the right-panel overview (which has no time picker). The
 * `getAttackChainDataForRangeV3` helper applies the BA-v.3 tab's current
 * time range so the left-flyout chain and the table stay in sync as the
 * user changes the picker.
 */
const buildAnomalyCountByTactic = (
  rows: readonly BehavioralAnomalyV3TableRow[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const tactic of MITRE_TACTIC_NAMES) counts[tactic] = 0;
  for (const row of rows) {
    const primaryTactic = row.mitreTactics[0];
    if (primaryTactic && primaryTactic in counts) {
      counts[primaryTactic] += 1;
    }
  }
  return counts;
};

const triggeredFromCounts = (counts: Record<string, number>): string[] =>
  MITRE_TACTIC_NAMES.filter((tactic) => counts[tactic] > 0);

/** All-time per-tactic counts — sum equals `MOCK_ANOMALY_V3_TOTAL_COUNT`. */
export const MOCK_ANOMALY_COUNT_BY_TACTIC_V3: Readonly<Record<string, number>> =
  buildAnomalyCountByTactic(MOCK_ANOMALY_V3_TABLE_ROWS);

/** Tactics with at least one anomaly in the full mock table. */
export const MOCK_TRIGGERED_TACTICS_V3: readonly string[] = triggeredFromCounts(
  MOCK_ANOMALY_COUNT_BY_TACTIC_V3
);

/**
 * Time-range-aware lookup used by the BA-v.3 "Attack chain" section. Walks
 * the mock anomaly rows that fall within the selected window (optionally
 * narrowed by the tab's Anomaly score filter) and returns both the
 * triggered tactics (in canonical kill-chain order) AND the per-tactic
 * anomaly counts whose sum equals the table's in-range total — so the
 * chain chip totals stay in step with the Anomalies table.
 */
export const getAttackChainDataForRangeV3 = (
  timeRangeMs: { from: number; to: number },
  allowedSeverityThresholds?: ReadonlySet<number>
): {
  triggeredTactics: readonly string[];
  anomalyCountByTactic: Readonly<Record<string, number>>;
} => {
  const inRange = MOCK_ANOMALY_V3_TABLE_ROWS.filter(
    (row) =>
      row.timestamp >= timeRangeMs.from &&
      row.timestamp <= timeRangeMs.to &&
      matchesSeverity(row.anomalyScore, allowedSeverityThresholds)
  );
  const anomalyCountByTactic = buildAnomalyCountByTactic(inRange);
  return {
    anomalyCountByTactic,
    triggeredTactics: triggeredFromCounts(anomalyCountByTactic),
  };
};

/**
 * Back-compat shim — kept for any caller that still wants just the list of
 * triggered tactics. New callers should prefer
 * `getAttackChainDataForRangeV3` to get the counts in the same pass.
 */
export const getTriggeredTacticsForRangeV3 = (timeRangeMs: {
  from: number;
  to: number;
}): string[] => {
  return [...getAttackChainDataForRangeV3(timeRangeMs).triggeredTactics];
};

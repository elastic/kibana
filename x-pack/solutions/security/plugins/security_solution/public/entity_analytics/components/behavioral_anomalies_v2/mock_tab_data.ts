/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_ANOMALY_V2_TOTAL_COUNT } from './mock_data';
import type {
  BehavioralAnomalyV2TableRow,
  HeatmapRecordV2,
  MockMlJobV2,
  UnderlyingEventRefV2,
  ViewByFieldV2,
} from './types';

const HOUR_MS = 60 * 60 * 1000;

/** Default left-tab time range — drives the EuiSuperDatePicker initial value. */
export const DEFAULT_TIMELINE_RANGE_V2 = { from: 'now-1y', to: 'now' } as const;

export const MOCK_ML_JOBS_V2: MockMlJobV2[] = [
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

// Score curve used to seed deterministic-looking anomalies across whatever
// time range the EuiSuperDatePicker selects. Each row gets a different slice
// of the curve so the swim lane looks varied without being random.
const ROW_SCORE_CURVES: ReadonlyArray<ReadonlyArray<number>> = [
  [78, 22, 64, 12, 88, 35, 55],
  [42, 80, 28, 70, 18, 92, 38],
  [25, 60, 85, 30, 50, 15, 72],
  [55, 18, 45, 82, 25, 65, 35],
  [90, 40, 22, 58, 75, 28, 48],
  [32, 68, 50, 18, 80, 42, 62],
];

const SAMPLES_PER_ROW = 8;
const JITTER_RATIO = 0.05;

/**
 * Sprinkles a deterministic set of anomaly records across the supplied time
 * range. The swim lane re-renders whenever `timeRangeMs` changes, so this
 * function is the single place the EuiSuperDatePicker selection feeds into.
 */
export const getTimelineHeatmapRecordsV2 = (
  rowKeys: string[],
  yAccessor: ViewByFieldV2,
  timeRangeMs: { from: number; to: number }
): HeatmapRecordV2[] => {
  const span = Math.max(0, timeRangeMs.to - timeRangeMs.from);
  if (span === 0) {
    return [];
  }
  const jitter = span * JITTER_RATIO;

  return rowKeys.flatMap((rowKey, rowIndex) => {
    const curve = ROW_SCORE_CURVES[rowIndex % ROW_SCORE_CURVES.length];
    return Array.from({ length: SAMPLES_PER_ROW }, (_, i) => {
      // Spread `SAMPLES_PER_ROW` records evenly across the span, with a small
      // deterministic jitter offset per (row, sample) so cells don't perfectly
      // align across rows.
      const t =
        timeRangeMs.from +
        ((i + 0.5) / SAMPLES_PER_ROW) * span +
        ((((rowIndex + 1) * (i + 1)) % 7) - 3) * (jitter / 7);
      const score = curve[(i + rowIndex) % curve.length];
      return {
        '@timestamp': Math.min(timeRangeMs.to, Math.max(timeRangeMs.from, t)),
        record_score: score,
        [yAccessor]: rowKey,
      };
    });
  });
};

export const getTimelineRowKeysV2 = (viewBy: ViewByFieldV2): string[] => {
  if (viewBy === 'job_id') {
    return MOCK_ML_JOBS_V2.map((job) => job.id);
  }
  return ['john.doe', 'server-01', '10.0.0.12', '192.168.1.44', 'winlogon.exe', 'sshd'];
};

export const getJobDisplayNameV2 = (jobId: string): string =>
  MOCK_ML_JOBS_V2.find((job) => job.id === jobId)?.displayName ?? jobId;

interface TableRowTemplate
  extends Omit<BehavioralAnomalyV2TableRow, 'id' | 'timestamp' | 'underlyingEvents'> {
  daysAgo: number;
  hour: number;
  /** Mock event ids (1-3 per template) used to scope Add to case / timeline / Discover. */
  eventIds: string[];
}

const MOCK_EVENT_INDEX = 'logs-*';

const TABLE_ROWS_TEMPLATE: TableRowTemplate[] = [
  {
    jobId: 'rare_destination_country',
    jobDisplayName: 'New country login',
    daysAgo: 4,
    hour: 22,
    baseline: 'United States',
    anomaly: 'Italy',
    anomalyScore: 80.09,
    detectorIndex: 0,
    entities: { 'user.name': 'john.doe' },
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
    eventIds: ['evt-auth-spike-1', 'evt-auth-spike-2', 'evt-auth-spike-3'],
  },
  {
    jobId: 'suspicious_login_after_hours',
    jobDisplayName: 'Unusual login hour',
    daysAgo: 5,
    hour: 9,
    baseline: '09:00–18:00',
    anomaly: '06:14',
    anomalyScore: 64.3,
    detectorIndex: 0,
    entities: { 'user.name': 'john.doe' },
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
    anomalyScore: 85.6,
    detectorIndex: 0,
    entities: { 'host.name': 'server-01' },
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
    eventIds: ['evt-dns-1'],
  },
];

const buildUnderlyingEvents = (eventIds: string[], suffix: string): UnderlyingEventRefV2[] =>
  eventIds.map((eventId) => ({ _id: `${eventId}-${suffix}`, _index: MOCK_EVENT_INDEX }));

const buildTableRows = (): BehavioralAnomalyV2TableRow[] => {
  const now = Date.now();
  const rows: BehavioralAnomalyV2TableRow[] = TABLE_ROWS_TEMPLATE.map((template, index) => ({
    id: `anomaly-row-v2-${index}`,
    jobId: template.jobId,
    jobDisplayName: template.jobDisplayName,
    timestamp: now - template.daysAgo * 24 * HOUR_MS + template.hour * HOUR_MS,
    baseline: template.baseline,
    anomaly: template.anomaly,
    spike: template.spike,
    anomalyScore: template.anomalyScore,
    detectorIndex: template.detectorIndex,
    entities: template.entities,
    underlyingEvents: buildUnderlyingEvents(template.eventIds, `v2-${index}`),
  }));

  let counter = rows.length;
  while (rows.length < MOCK_ANOMALY_V2_TOTAL_COUNT) {
    const template = TABLE_ROWS_TEMPLATE[counter % TABLE_ROWS_TEMPLATE.length];
    rows.push({
      id: `anomaly-row-v2-${counter}`,
      jobId: template.jobId,
      jobDisplayName: template.jobDisplayName,
      timestamp: now - (counter % 10) * HOUR_MS * 5,
      baseline: template.baseline,
      anomaly: template.anomaly,
      spike: template.spike,
      anomalyScore: Math.max(15, template.anomalyScore - (counter % 7) * 3),
      detectorIndex: template.detectorIndex,
      entities: template.entities,
      underlyingEvents: buildUnderlyingEvents(template.eventIds, `v2-${counter}`),
    });
    counter += 1;
  }

  return rows.sort((a, b) => b.timestamp - a.timestamp);
};

export const MOCK_ANOMALY_V2_TABLE_ROWS = buildTableRows();

export const DEFAULT_PAGE_SIZE_V2 = 10;

export const PAGE_SIZE_OPTIONS_V2 = [10, 25, 50];

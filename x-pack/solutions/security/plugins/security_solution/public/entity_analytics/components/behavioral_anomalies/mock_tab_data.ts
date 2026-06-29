/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { BEHAVIORAL_ANOMALIES_TIME_RANGE } from './constants';
import { MOCK_ANOMALY_TOTAL_COUNT } from './mock_data';
import type {
  BehavioralAnomalyTableRow,
  HeatmapRecord,
  MockMlJob,
  UnderlyingEventRef,
  ViewByField,
} from './types';

const HOUR_MS = 60 * 60 * 1000;

const resolveTimeMillis = (value: string): number => {
  const parsed = dateMath.parse(value)?.valueOf();
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  const native = new Date(value).getTime();
  return Number.isFinite(native) ? native : Date.now();
};

/** View-by options aligned with Anomaly Explorer influencer / job fields. */
export const VIEW_BY_FIELD_OPTIONS: Array<{ value: ViewByField; text: string }> = [
  { value: 'job_id', text: 'job ID' },
  { value: 'user.name', text: 'user.name' },
  { value: 'host.name', text: 'host.name' },
  { value: 'source.ip', text: 'source.ip' },
  { value: 'destination.ip', text: 'destination.ip' },
  { value: 'event.category', text: 'event.category' },
  { value: 'process.name', text: 'process.name' },
];

export const MOCK_ML_JOBS: MockMlJob[] = [
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

const JOB_HEATMAP_PATTERN: Record<string, number[]> = {
  auth_high_count_logon: [10, 11, 16, 17],
  suspicious_login_after_hours: [6, 7, 20],
  rare_destination_country: [14, 15, 21],
  unusual_process_execution: [9, 18],
  high_source_ip_count: [12, 13, 19],
  rare_user_agent: [8, 22],
  dns_tunneling_score: [11, 12],
  privilege_escalation_host: [16, 17, 18],
  data_exfil_volume: [19, 20, 21],
  lateral_movement_score: [15, 16],
  oauth_token_anomaly: [10, 14],
  cloud_api_call_rate: [17, 18, 19],
};

const SCORE_BY_HOUR: Record<number, number> = {
  6: 64,
  7: 58,
  8: 42,
  9: 55,
  10: 80,
  11: 72,
  12: 48,
  13: 52,
  14: 85,
  15: 72,
  16: 82,
  17: 76,
  18: 68,
  19: 45,
  20: 38,
  21: 30,
  22: 92,
};

const getFromMs = () => resolveTimeMillis(BEHAVIORAL_ANOMALIES_TIME_RANGE.from);

export const getTimelineHeatmapRecords = (
  rowKeys: string[],
  yAccessor: ViewByField
): HeatmapRecord[] => {
  const fromMs = getFromMs();

  return rowKeys.flatMap((rowKey) => {
    const hours =
      yAccessor === 'job_id'
        ? JOB_HEATMAP_PATTERN[rowKey] ?? [10, 14, 18]
        : [9 + (rowKey.length % 5), 14 + (rowKey.length % 4), 19];

    return hours.map((hourIndex) => ({
      '@timestamp': fromMs + hourIndex * HOUR_MS + HOUR_MS / 2,
      record_score: SCORE_BY_HOUR[hourIndex] ?? 50,
      [yAccessor]: rowKey,
    }));
  });
};

export const getTimelineRowKeys = (viewBy: ViewByField): string[] => {
  if (viewBy === 'job_id') {
    return MOCK_ML_JOBS.map((job) => job.id);
  }
  return ['john.doe', 'server-01', '10.0.0.12', '192.168.1.44', 'winlogon.exe', 'sshd'];
};

export const getJobDisplayName = (jobId: string): string =>
  MOCK_ML_JOBS.find((job) => job.id === jobId)?.displayName ?? jobId;

interface TableRowTemplate
  extends Omit<BehavioralAnomalyTableRow, 'id' | 'timestamp' | 'underlyingEvents'> {
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

const buildUnderlyingEvents = (eventIds: string[], suffix: string): UnderlyingEventRef[] =>
  eventIds.map((eventId) => ({ _id: `${eventId}-${suffix}`, _index: MOCK_EVENT_INDEX }));

const buildTableRows = (): BehavioralAnomalyTableRow[] => {
  const now = Date.now();
  const rows: BehavioralAnomalyTableRow[] = TABLE_ROWS_TEMPLATE.map((template, index) => ({
    id: `anomaly-row-${index}`,
    jobId: template.jobId,
    jobDisplayName: template.jobDisplayName,
    timestamp: now - template.daysAgo * 24 * HOUR_MS + template.hour * HOUR_MS,
    baseline: template.baseline,
    anomaly: template.anomaly,
    spike: template.spike,
    anomalyScore: template.anomalyScore,
    detectorIndex: template.detectorIndex,
    entities: template.entities,
    underlyingEvents: buildUnderlyingEvents(template.eventIds, String(index)),
  }));

  let counter = rows.length;
  while (rows.length < MOCK_ANOMALY_TOTAL_COUNT) {
    const template = TABLE_ROWS_TEMPLATE[counter % TABLE_ROWS_TEMPLATE.length];
    rows.push({
      id: `anomaly-row-${counter}`,
      jobId: template.jobId,
      jobDisplayName: template.jobDisplayName,
      timestamp: now - (counter % 10) * HOUR_MS * 5,
      baseline: template.baseline,
      anomaly: template.anomaly,
      spike: template.spike,
      anomalyScore: Math.max(15, template.anomalyScore - (counter % 7) * 3),
      detectorIndex: template.detectorIndex,
      entities: template.entities,
      underlyingEvents: buildUnderlyingEvents(template.eventIds, String(counter)),
    });
    counter += 1;
  }

  return rows.sort((a, b) => b.timestamp - a.timestamp);
};

export const MOCK_ANOMALY_TABLE_ROWS = buildTableRows();

export const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

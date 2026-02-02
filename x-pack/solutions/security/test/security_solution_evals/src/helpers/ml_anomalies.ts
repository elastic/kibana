/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * ML anomaly index names used by the entity analytics skills.
 * Each worker creates its own indices to avoid conflicts during parallel execution.
 */
export function getMlAnomalyIndex(category: string, workerId: string): string {
  return `.ml-anomalies-${category}-${workerId}`;
}

/**
 * Base ML anomaly document structure.
 */
interface MlAnomalyRecord {
  job_id: string;
  result_type: 'record';
  probability: number;
  record_score: number;
  initial_record_score: number;
  bucket_span: number;
  detector_index: number;
  is_interim: boolean;
  timestamp: number;
  function: string;
  function_description: string;
  influencers: Array<{
    influencer_field_name: string;
    influencer_field_values: string[];
  }>;
  [key: string]: unknown;
}

/**
 * Creates the ML anomalies index with proper mappings.
 */
async function ensureMlAnomalyIndex(esClient: Client, index: string): Promise<void> {
  await esClient.indices.create(
    {
      index,
      settings: {
        index: {
          hidden: true,
          number_of_shards: 1,
          number_of_replicas: 0,
        },
      },
      mappings: {
        dynamic_templates: [
          {
            map_objects: {
              match_mapping_type: 'object',
              mapping: { type: 'object' },
            },
          },
          {
            non_objects_as_keywords: {
              match: '*',
              mapping: { type: 'keyword' },
            },
          },
        ],
        properties: {
          '@timestamp': { type: 'alias', path: 'timestamp' },
          job_id: { type: 'keyword' },
          result_type: { type: 'keyword' },
          record_score: { type: 'double' },
          timestamp: { type: 'date' },
          'user.name': { type: 'keyword' },
          'source.ip': { type: 'keyword' },
          'source.geo.country_iso_code': { type: 'keyword' },
          'host.name': { type: 'keyword' },
          influencers: {
            type: 'nested',
            properties: {
              influencer_field_name: { type: 'keyword' },
              influencer_field_values: { type: 'keyword' },
            },
          },
        },
      },
    },
    { ignore: [400] } // Ignore if already exists
  );
}

/**
 * Seeds authentication anomaly data for testing.
 */
export async function seedAuthAnomalies(
  esClient: Client,
  workerId: string
): Promise<{ index: string }> {
  const index = getMlAnomalyIndex('security_auth', workerId);
  await ensureMlAnomalyIndex(esClient, index);

  const now = Date.now();
  const records: MlAnomalyRecord[] = [
    // auth_rare_source_ip_for_a_user
    {
      job_id: 'auth_rare_source_ip_for_a_user',
      result_type: 'record',
      probability: 0.001,
      record_score: 85.5,
      initial_record_score: 85.5,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'rare',
      function_description: 'rare',
      field_name: 'source.ip',
      partition_field_name: 'user.name',
      partition_field_value: 'svc-account-1',
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['svc-account-1'] },
        { influencer_field_name: 'source.ip', influencer_field_values: ['203.0.113.45'] },
        { influencer_field_name: 'source.geo.country_iso_code', influencer_field_values: ['CN'] },
      ],
      'user.name': ['svc-account-1'],
      'source.ip': ['203.0.113.45'],
      'source.geo.country_iso_code': ['CN'],
    },
    // suspicious_login_activity
    {
      job_id: 'suspicious_login_activity',
      result_type: 'record',
      probability: 0.002,
      record_score: 90.1,
      initial_record_score: 90.1,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'high_non_zero_count',
      function_description: 'high_non_zero_count',
      typical: [12.0],
      actual: [247.0],
      influencers: [
        { influencer_field_name: 'host.name', influencer_field_values: ['web-server-prod-01'] },
        {
          influencer_field_name: 'user.name',
          influencer_field_values: ['admin-user-1', 'service-account-xyz'],
        },
      ],
      'host.name': ['web-server-prod-01'],
      'user.name': ['admin-user-1', 'service-account-xyz'],
    },
    // auth_rare_user
    {
      job_id: 'auth_rare_user',
      result_type: 'record',
      probability: 0.0008,
      record_score: 92.4,
      initial_record_score: 92.4,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'rare',
      function_description: 'rare',
      by_field_name: 'user.name',
      by_field_value: 'dormant-admin-account',
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['dormant-admin-account'] },
        { influencer_field_name: 'source.ip', influencer_field_values: ['172.16.0.45'] },
      ],
      'user.name': ['dormant-admin-account'],
      'source.ip': ['172.16.0.45'],
    },
    // auth_rare_hour_for_a_user
    {
      job_id: 'auth_rare_hour_for_a_user',
      result_type: 'record',
      probability: 0.0009,
      record_score: 87.3,
      initial_record_score: 87.3,
      bucket_span: 900,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'time_of_day',
      function_description: 'time_of_day',
      typical: [9.0],
      actual: [3.0],
      by_field_name: 'user.name',
      by_field_value: 'john.doe',
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['john.doe'] },
        { influencer_field_name: 'source.ip', influencer_field_values: ['198.51.100.67'] },
      ],
      'user.name': ['john.doe'],
      'source.ip': ['198.51.100.67'],
    },
    // v3_windows_anomalous_service
    {
      job_id: 'v3_windows_anomalous_service',
      result_type: 'record',
      probability: 0.0005,
      record_score: 94.2,
      initial_record_score: 94.2,
      bucket_span: 900,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'rare',
      function_description: 'rare',
      by_field_name: 'winlog.event_data.ServiceName',
      by_field_value: 'UpdateServiceX',
      influencers: [
        { influencer_field_name: 'host.name', influencer_field_values: ['win-dc-01'] },
        {
          influencer_field_name: 'winlog.event_data.ServiceName',
          influencer_field_values: ['UpdateServiceX'],
        },
      ],
      'host.name': ['win-dc-01'],
      'winlog.event_data.ServiceName': ['UpdateServiceX'],
    },
  ];

  await bulkIndexAnomalies(esClient, index, records, workerId);
  return { index };
}

/**
 * Seeds data exfiltration anomaly data for testing.
 */
export async function seedDataExfiltrationAnomalies(
  esClient: Client,
  workerId: string
): Promise<{ index: string }> {
  const index = getMlAnomalyIndex('ded', workerId);
  await ensureMlAnomalyIndex(esClient, index);

  const now = Date.now();
  const records: MlAnomalyRecord[] = [
    {
      job_id: 'ded_high_bytes_written_to_external_device',
      result_type: 'record',
      probability: 0.001,
      record_score: 88.5,
      initial_record_score: 88.5,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'high_sum',
      function_description: 'high_sum',
      typical: [1000000],
      actual: [50000000],
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['data-stealer-1'] },
        { influencer_field_name: 'host.name', influencer_field_values: ['workstation-01'] },
      ],
      'user.name': ['data-stealer-1'],
      'host.name': ['workstation-01'],
    },
    {
      job_id: 'ded_high_sent_bytes_destination_geo_country_iso_code',
      result_type: 'record',
      probability: 0.002,
      record_score: 91.2,
      initial_record_score: 91.2,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'high_sum',
      function_description: 'high_sum',
      typical: [500000],
      actual: [25000000],
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['suspicious-uploader'] },
        {
          influencer_field_name: 'destination.geo.country_iso_code',
          influencer_field_values: ['RU'],
        },
      ],
      'user.name': ['suspicious-uploader'],
      'destination.geo.country_iso_code': ['RU'],
    },
    {
      job_id: 'ded_high_sent_bytes_destination_ip',
      result_type: 'record',
      probability: 0.0015,
      record_score: 86.7,
      initial_record_score: 86.7,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'high_sum',
      function_description: 'high_sum',
      typical: [200000],
      actual: [15000000],
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['large-download-user'] },
        { influencer_field_name: 'destination.ip', influencer_field_values: ['203.0.113.99'] },
      ],
      'user.name': ['large-download-user'],
      'destination.ip': ['203.0.113.99'],
    },
  ];

  await bulkIndexAnomalies(esClient, index, records, workerId);
  return { index };
}

/**
 * Seeds lateral movement anomaly data for testing.
 */
export async function seedLateralMovementAnomalies(
  esClient: Client,
  workerId: string
): Promise<{ index: string }> {
  const index = getMlAnomalyIndex('lmd', workerId);
  await ensureMlAnomalyIndex(esClient, index);

  const now = Date.now();
  const records: MlAnomalyRecord[] = [
    {
      job_id: 'lmd_high_count_remote_file_transfer',
      result_type: 'record',
      probability: 0.001,
      record_score: 89.5,
      initial_record_score: 89.5,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'high_count',
      function_description: 'high_count',
      typical: [5],
      actual: [150],
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['lateral-mover-1'] },
        { influencer_field_name: 'host.name', influencer_field_values: ['compromised-host-01'] },
        { influencer_field_name: 'destination.ip', influencer_field_values: ['10.0.0.50'] },
      ],
      'user.name': ['lateral-mover-1'],
      'host.name': ['compromised-host-01'],
      'destination.ip': ['10.0.0.50'],
    },
    {
      job_id: 'lmd_high_file_size_remote_file_transfer',
      result_type: 'record',
      probability: 0.002,
      record_score: 85.3,
      initial_record_score: 85.3,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'high_sum',
      function_description: 'high_sum',
      typical: [1000000],
      actual: [100000000],
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['data-mover-1'] },
        { influencer_field_name: 'host.name', influencer_field_values: ['file-server-01'] },
      ],
      'user.name': ['data-mover-1'],
      'host.name': ['file-server-01'],
    },
  ];

  await bulkIndexAnomalies(esClient, index, records, workerId);
  return { index };
}

/**
 * Seeds network anomaly data for testing.
 */
export async function seedNetworkAnomalies(
  esClient: Client,
  workerId: string
): Promise<{ index: string }> {
  const index = getMlAnomalyIndex('packetbeat', workerId);
  await ensureMlAnomalyIndex(esClient, index);

  const now = Date.now();
  const records: MlAnomalyRecord[] = [
    {
      job_id: 'packetbeat_rare_server_domain',
      result_type: 'record',
      probability: 0.001,
      record_score: 87.8,
      initial_record_score: 87.8,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'rare',
      function_description: 'rare',
      by_field_name: 'server.domain',
      by_field_value: 'suspicious-domain.evil.com',
      influencers: [
        {
          influencer_field_name: 'server.domain',
          influencer_field_values: ['suspicious-domain.evil.com'],
        },
        { influencer_field_name: 'host.name', influencer_field_values: ['infected-host-01'] },
      ],
      'server.domain': ['suspicious-domain.evil.com'],
      'host.name': ['infected-host-01'],
    },
  ];

  await bulkIndexAnomalies(esClient, index, records, workerId);
  return { index };
}

/**
 * Seeds privileged access anomaly data for testing.
 */
export async function seedPrivilegedAccessAnomalies(
  esClient: Client,
  workerId: string
): Promise<{ index: string }> {
  const index = getMlAnomalyIndex('pad', workerId);
  await ensureMlAnomalyIndex(esClient, index);

  const now = Date.now();
  const records: MlAnomalyRecord[] = [
    {
      job_id: 'pad_linux_rare_process_executed_by_user',
      result_type: 'record',
      probability: 0.001,
      record_score: 90.5,
      initial_record_score: 90.5,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'rare',
      function_description: 'rare',
      by_field_name: 'process.name',
      by_field_value: 'suspicious-admin-tool',
      partition_field_name: 'user.name',
      partition_field_value: 'admin-user-unusual',
      influencers: [
        { influencer_field_name: 'user.name', influencer_field_values: ['admin-user-unusual'] },
        {
          influencer_field_name: 'process.name',
          influencer_field_values: ['suspicious-admin-tool'],
        },
        { influencer_field_name: 'host.name', influencer_field_values: ['linux-server-01'] },
      ],
      'user.name': ['admin-user-unusual'],
      'process.name': ['suspicious-admin-tool'],
      'host.name': ['linux-server-01'],
    },
    {
      job_id: 'pad_linux_high_count_privileged_process_events_by_user',
      result_type: 'record',
      probability: 0.002,
      record_score: 88.2,
      initial_record_score: 88.2,
      bucket_span: 3600,
      detector_index: 0,
      is_interim: false,
      timestamp: now,
      function: 'high_count',
      function_description: 'high_count',
      typical: [10],
      actual: [500],
      partition_field_name: 'user.name',
      partition_field_value: 'privileged-account-abuse',
      influencers: [
        {
          influencer_field_name: 'user.name',
          influencer_field_values: ['privileged-account-abuse'],
        },
        { influencer_field_name: 'host.name', influencer_field_values: ['admin-workstation-02'] },
      ],
      'user.name': ['privileged-account-abuse'],
      'host.name': ['admin-workstation-02'],
    },
  ];

  await bulkIndexAnomalies(esClient, index, records, workerId);
  return { index };
}

/**
 * Bulk indexes anomaly records.
 */
async function bulkIndexAnomalies(
  esClient: Client,
  index: string,
  records: MlAnomalyRecord[],
  workerId: string
): Promise<void> {
  const operations = records.flatMap((record, i) => [
    { index: { _index: index, _id: `${workerId}-${record.job_id}-${i}` } },
    record,
  ]);

  await esClient.bulk({
    refresh: 'wait_for',
    operations,
  });
}

/**
 * Cleans up ML anomaly indices for a specific worker.
 */
export async function cleanupMlAnomalyIndices(esClient: Client, workerId: string): Promise<void> {
  const indices = [
    getMlAnomalyIndex('security_auth', workerId),
    getMlAnomalyIndex('ded', workerId),
    getMlAnomalyIndex('lmd', workerId),
    getMlAnomalyIndex('packetbeat', workerId),
    getMlAnomalyIndex('pad', workerId),
  ];

  for (const index of indices) {
    await esClient.indices.delete({ index }, { ignore: [404] });
  }
}

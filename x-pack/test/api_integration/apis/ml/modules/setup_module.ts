/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { isEmpty, sortBy } from 'lodash';

import { FtrProviderContext } from '../../../ftr_provider_context';

import { JOB_STATE, DATAFEED_STATE } from '../../../../../plugins/ml/common/constants/states';
import { Job } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataListPositive = [
    {
      testTitleSuffix:
        'for sample_data_weblogs with prefix, startDatafeed false and estimateModelMemory false',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_sample_logs',
      indexPattern: { name: 'ft_module_sample_logs', timeField: '@timestamp' },
      module: 'sample_data_weblogs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf1_',
        indexPatternName: 'ft_module_sample_logs',
        startDatafeed: false,
        estimateModelMemory: false,
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf1_low_request_rate',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf1_response_code_rates',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf1_url_scanning',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for sample_data_weblogs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_sample_logs',
      indexPattern: { name: 'ft_module_sample_logs', timeField: '@timestamp' },
      module: 'sample_data_weblogs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf2_',
        indexPatternName: 'ft_module_sample_logs',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf2_low_request_rate',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf2_response_code_rates',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf2_url_scanning',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for apache_ecs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_apache',
      indexPattern: { name: 'ft_module_apache', timeField: '@timestamp' },
      module: 'apache_ecs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf3_',
        indexPatternName: 'ft_module_apache',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf3_low_request_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf3_source_ip_request_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf3_source_ip_url_count_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf3_status_code_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf3_visitor_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: ['ml_http_access_filebeat_ecs'] as string[],
        visualizations: [
          'ml_http_access_map_ecs',
          'ml_http_access_source_ip_timechart_ecs',
          'ml_http_access_status_code_timechart_ecs',
          'ml_http_access_top_source_ips_table_ecs',
          'ml_http_access_top_urls_table_ecs',
          'ml_http_access_unique_count_url_timechart_ecs',
          'ml_http_access_events_timechart_ecs',
        ] as string[],
        dashboards: ['ml_http_access_explorer_ecs'] as string[],
      },
    },
    {
      testTitleSuffix:
        'for apm_nodejs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_apm',
      indexPattern: { name: 'ft_module_apm', timeField: '@timestamp' },
      module: 'apm_nodejs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf4_',
        indexPatternName: 'ft_module_apm',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf4_abnormal_span_durations_nodejs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf4_abnormal_trace_durations_nodejs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf4_decreased_throughput_nodejs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for apm_transaction with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_apm',
      indexPattern: { name: 'ft_module_apm', timeField: '@timestamp' },
      module: 'apm_transaction',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf5_',
        indexPatternName: 'ft_module_apm',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf5_high_mean_transaction_duration',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for logs_ui_analysis with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_logs',
      indexPattern: { name: 'ft_module_logs', timeField: '@timestamp' },
      module: 'logs_ui_analysis',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf6_',
        indexPatternName: 'ft_module_logs',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf6_log-entry-rate',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for logs_ui_categories with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_logs',
      indexPattern: { name: 'ft_module_logs', timeField: '@timestamp' },
      module: 'logs_ui_categories',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf7_',
        indexPatternName: 'ft_module_logs',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf7_log-entry-categories-count',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix: 'for nginx_ecs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_nginx',
      indexPattern: { name: 'ft_module_nginx', timeField: '@timestamp' },
      module: 'nginx_ecs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf8_',
        indexPatternName: 'ft_module_nginx',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf8_visitor_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf8_status_code_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf8_source_ip_url_count_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf8_source_ip_request_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf8_low_request_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: ['ml_http_access_filebeat_ecs'] as string[],
        visualizations: [
          'ml_http_access_map_ecs',
          'ml_http_access_source_ip_timechart_ecs',
          'ml_http_access_status_code_timechart_ecs',
          'ml_http_access_top_source_ips_table_ecs',
          'ml_http_access_top_urls_table_ecs',
          'ml_http_access_unique_count_url_timechart_ecs',
          'ml_http_access_events_timechart_ecs',
        ] as string[],
        dashboards: ['ml_http_access_explorer_ecs'] as string[],
      },
    },
    {
      testTitleSuffix:
        'for sample_data_ecommerce with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_sample_ecommerce',
      indexPattern: { name: 'ft_module_sample_ecommerce', timeField: 'order_date' },
      module: 'sample_data_ecommerce',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf9_',
        indexPatternName: 'ft_module_sample_ecommerce',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf9_high_sum_total_sales',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for siem_auditbeat_auth with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_auditbeat',
      indexPattern: { name: 'ft_module_siem_auditbeat', timeField: '@timestamp' },
      module: 'siem_auditbeat_auth',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf11_',
        indexPatternName: 'ft_module_siem_auditbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf11_suspicious_login_activity_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for siem_packetbeat with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_packetbeat',
      indexPattern: { name: 'ft_module_siem_packetbeat', timeField: '@timestamp' },
      module: 'siem_packetbeat',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf12_',
        indexPatternName: 'ft_module_siem_packetbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf12_packetbeat_dns_tunneling',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf12_packetbeat_rare_dns_question',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf12_packetbeat_rare_server_domain',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf12_packetbeat_rare_urls',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf12_packetbeat_rare_user_agent',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for uptime_heartbeat with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_heartbeat',
      indexPattern: { name: 'ft_module_heartbeat', timeField: '@timestamp' },
      module: 'uptime_heartbeat',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf13_',
        indexPatternName: 'ft_module_heartbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf13_high_latency_by_geo',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for auditbeat_process_hosts_ecs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_auditbeat',
      indexPattern: { name: 'ft_module_auditbeat', timeField: '@timestamp' },
      module: 'auditbeat_process_hosts_ecs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf14_',
        indexPatternName: 'ft_module_auditbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf14_hosts_high_count_process_events_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf14_hosts_rare_process_activity_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: ['ml_auditbeat_hosts_process_events_ecs'] as string[],
        visualizations: [
          'ml_auditbeat_hosts_process_event_rate_by_process_ecs',
          'ml_auditbeat_hosts_process_event_rate_vis_ecs',
          'ml_auditbeat_hosts_process_occurrence_ecs',
        ] as string[],
        dashboards: [
          'ml_auditbeat_hosts_process_event_rate_ecs',
          'ml_auditbeat_hosts_process_explorer_ecs',
        ] as string[],
      },
    },
    {
      testTitleSuffix:
        'for security_linux with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_security_endpoint',
      indexPattern: { name: 'ft_logs-endpoint.events.*', timeField: '@timestamp' },
      module: 'security_linux',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf15_',
        indexPatternName: 'ft_logs-endpoint.events.*',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf15_v2_rare_process_by_host_linux_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf15_v2_linux_rare_metadata_user',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf15_v2_linux_rare_metadata_process',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf15_v2_linux_anomalous_user_name_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf15_v2_linux_anomalous_process_all_hosts_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf15_v2_linux_anomalous_network_port_activity_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for security_windows with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_security_endpoint',
      indexPattern: { name: 'ft_logs-endpoint.events.*', timeField: '@timestamp' },
      module: 'security_windows',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf16_',
        indexPatternName: 'ft_logs-endpoint.events.*',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf16_v2_rare_process_by_host_windows_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf16_v2_windows_anomalous_network_activity_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf16_v2_windows_anomalous_path_activity_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf16_v2_windows_anomalous_process_all_hosts_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf16_v2_windows_anomalous_process_creation',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf16_v2_windows_anomalous_user_name_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf16_v2_windows_rare_metadata_process',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf16_v2_windows_rare_metadata_user',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for metricbeat_system_ecs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_metricbeat',
      indexPattern: { name: 'ft_module_metricbeat', timeField: '@timestamp' },
      module: 'metricbeat_system_ecs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf17_',
        indexPatternName: 'ft_module_metricbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf17_max_disk_utilization_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf17_metricbeat_outages_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf17_high_mean_cpu_iowait_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for metrics_ui_hosts with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_metrics_ui',
      indexPattern: { name: 'ft_module_metrics_ui', timeField: '@timestamp' },
      module: 'metrics_ui_hosts',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf18_',
        indexPatternName: 'ft_module_metrics_ui',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf18_hosts_memory_usage',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf18_hosts_network_in',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf18_hosts_network_out',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for metrics_ui_k8s with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_metrics_ui',
      indexPattern: { name: 'ft_module_metrics_ui', timeField: '@timestamp' },
      module: 'metrics_ui_k8s',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf19_',
        indexPatternName: 'ft_module_metrics_ui',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf19_k8s_memory_usage',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf19_k8s_network_in',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf19_k8s_network_out',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for siem_cloudtrail with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_cloudtrail',
      indexPattern: { name: 'ft_module_siem_cloudtrail', timeField: '@timestamp' },
      module: 'siem_cloudtrail',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf20_',
        indexPatternName: 'ft_module_siem_cloudtrail',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf20_rare_method_for_a_city',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf20_rare_method_for_a_country',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf20_rare_method_for_a_username',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf20_high_distinct_count_error_message',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf20_rare_error_code',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for siem_winlogbeat with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_winlogbeat',
      indexPattern: { name: 'ft_module_siem_winlogbeat', timeField: '@timestamp' },
      module: 'siem_winlogbeat',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf21_',
        indexPatternName: 'ft_module_siem_winlogbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf21_rare_process_by_host_windows_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_anomalous_network_activity_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_anomalous_path_activity_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_anomalous_process_all_hosts_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_anomalous_process_creation',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_anomalous_script',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_anomalous_service',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_anomalous_user_name_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_rare_user_runas_event',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_rare_metadata_process',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf21_windows_rare_metadata_user',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for siem_winlogbeat_auth with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_winlogbeat',
      indexPattern: { name: 'ft_module_siem_winlogbeat', timeField: '@timestamp' },
      module: 'siem_winlogbeat_auth',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf22_',
        indexPatternName: 'ft_module_siem_winlogbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf22_windows_rare_user_type10_remote_login',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for apache_data_stream with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_apache_data_stream',
      indexPattern: { name: 'ft_module_apache_data_stream', timeField: '@timestamp' },
      module: 'apache_data_stream',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf23_',
        indexPatternName: 'ft_module_apache_data_stream',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf23_visitor_rate_apache',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf23_status_code_rate_apache',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf23_source_ip_url_count_apache',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf23_source_ip_request_rate_apache',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf23_low_request_rate_apache',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for nginx_data_stream with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_nginx_data_stream',
      indexPattern: { name: 'ft_module_nginx_data_stream', timeField: '@timestamp' },
      module: 'nginx_data_stream',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf24_',
        indexPatternName: 'ft_module_nginx_data_stream',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf24_visitor_rate_nginx',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf24_status_code_rate_nginx',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf24_source_ip_url_count_nginx',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf24_source_ip_request_rate_nginx',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
          {
            jobId: 'pf24_low_request_rate_nginx',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
  ];

  const testDataListNegative = [
    {
      testTitleSuffix: 'for non existent index pattern',
      module: 'sample_data_weblogs',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPatternName: 'non-existent-index-pattern',
        startDatafeed: false,
      },
      expected: {
        responseCode: 400,
        error: 'Bad Request',
        message:
          "Module's jobs contain custom URLs which require a kibana index pattern (non-existent-index-pattern) which cannot be found.",
      },
    },
    {
      testTitleSuffix: 'for unauthorized user',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_sample_logs',
      indexPattern: { name: 'ft_module_sample_logs', timeField: '@timestamp' },
      module: 'sample_data_weblogs',
      user: USER.ML_UNAUTHORIZED,
      requestBody: {
        prefix: 'pfn1_',
        indexPatternName: 'ft_module_sample_logs',
        startDatafeed: false,
      },
      expected: {
        responseCode: 403,
        error: 'Forbidden',
        message: 'Forbidden',
      },
    },
  ];

  async function executeSetupModuleRequest(
    module: string,
    user: USER,
    rqBody: object,
    rspCode: number
  ) {
    const { body } = await supertest
      .post(`/api/ml/modules/setup/${module}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(rqBody)
      .expect(rspCode);

    return body;
  }

  function mapIdsToSuccessObjects(ids: string[]) {
    const successObjects = sortBy(
      ids.map((id) => {
        return { id, success: true };
      }),
      'id'
    );

    return successObjects;
  }

  describe('module setup', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    for (const testData of testDataListPositive) {
      describe('sets up module data', function () {
        before(async () => {
          await esArchiver.loadIfNeeded(testData.sourceDataArchive);
          await ml.testResources.createIndexPatternIfNeeded(
            testData.indexPattern.name,
            testData.indexPattern.timeField
          );
        });

        after(async () => {
          for (const search of testData.expected.searches) {
            await ml.testResources.deleteSavedSearchById(search);
          }
          for (const visualization of testData.expected.visualizations) {
            await ml.testResources.deleteVisualizationById(visualization);
          }
          for (const dashboard of testData.expected.dashboards) {
            await ml.testResources.deleteDashboardById(dashboard);
          }
          await ml.api.cleanMlIndices();
        });

        it(testData.testTitleSuffix, async () => {
          const rspBody = await executeSetupModuleRequest(
            testData.module,
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          // verify response
          if (testData.expected.jobs.length > 0) {
            // jobs
            expect(rspBody).to.have.property('jobs');

            const expectedJobIds = testData.expected.jobs.map((job) => job.jobId);
            const expectedRspJobs = mapIdsToSuccessObjects(expectedJobIds);

            const actualRspJobs = sortBy(rspBody.jobs, 'id');

            expect(actualRspJobs).to.eql(
              expectedRspJobs,
              `Expected setup module response jobs to be '${JSON.stringify(
                expectedRspJobs
              )}' (got '${JSON.stringify(actualRspJobs)}')`
            );

            // datafeeds
            expect(rspBody).to.have.property('datafeeds');

            const expectedRspDatafeeds = sortBy(
              testData.expected.jobs.map((job) => {
                return {
                  awaitingMlNodeAllocation: false,
                  id: `datafeed-${job.jobId}`,
                  success: true,
                  started: testData.requestBody.startDatafeed,
                };
              }),
              'id'
            );

            const actualRspDatafeeds = sortBy(rspBody.datafeeds, 'id');

            expect(actualRspDatafeeds).to.eql(
              expectedRspDatafeeds,
              `Expected setup module response datafeeds to be '${JSON.stringify(
                expectedRspDatafeeds
              )}' (got '${JSON.stringify(actualRspDatafeeds)}')`
            );

            // saved objects
            const rspKibana: object = rspBody.kibana;
            let actualSearches = [];
            let actualVisualizations = [];
            let actualDashboards = [];

            if (isEmpty(rspKibana) === false) {
              actualSearches = sortBy(rspBody.kibana.search, 'id');
              actualVisualizations = sortBy(rspBody.kibana.visualization, 'id');
              actualDashboards = sortBy(rspBody.kibana.dashboard, 'id');
            }

            const expectedSearches = mapIdsToSuccessObjects(testData.expected.searches);
            const expectedVisualizations = mapIdsToSuccessObjects(testData.expected.visualizations);
            const expectedDashboards = mapIdsToSuccessObjects(testData.expected.dashboards);

            expect(actualSearches).to.eql(
              expectedSearches,
              `Expected setup module response searches to be '${JSON.stringify(
                expectedSearches
              )}' (got '${JSON.stringify(actualSearches)}')`
            );

            expect(actualVisualizations).to.eql(
              expectedVisualizations,
              `Expected setup module response visualizations to be '${JSON.stringify(
                expectedVisualizations
              )}' (got '${JSON.stringify(actualVisualizations)}')`
            );

            expect(actualDashboards).to.eql(
              expectedDashboards,
              `Expected setup module response dashboards to be '${JSON.stringify(
                expectedDashboards
              )}' (got '${JSON.stringify(actualDashboards)}')`
            );
          }

          // verify job + datafeed creation + states and model memory limit
          for (const job of testData.expected.jobs) {
            const datafeedId = `datafeed-${job.jobId}`;
            await ml.api.waitForAnomalyDetectionJobToExist(job.jobId);
            await ml.api.waitForDatafeedToExist(datafeedId);
            if (testData.requestBody.startDatafeed === true) {
              await ml.api.waitForADJobRecordCountToBePositive(job.jobId);
            }
            await ml.api.waitForDatafeedState(datafeedId, job.datafeedState, 4 * 60 * 1000);
            await ml.api.waitForJobState(job.jobId, job.jobState, 4 * 60 * 1000);

            // model memory limit should be <= 99mb
            const {
              body: jobsDetails,
            }: {
              body: {
                jobs: Job[];
              };
            } = await ml.api.getAnomalyDetectionJob(job.jobId);
            const actualModelMemoryLimit = jobsDetails.jobs[0].analysis_limits?.model_memory_limit;
            expect(actualModelMemoryLimit).to.match(/\d{1,2}mb/);
          }

          // verify saved objects creation
          for (const search of testData.expected.searches) {
            await ml.testResources.assertSavedSearchExistById(search);
          }
          for (const visualization of testData.expected.visualizations) {
            await ml.testResources.assertVisualizationExistById(visualization);
          }
          for (const dashboard of testData.expected.dashboards) {
            await ml.testResources.assertDashboardExistById(dashboard);
          }
        });
      });
    }

    for (const testData of testDataListNegative) {
      describe('rejects request', function () {
        before(async () => {
          if (testData.hasOwnProperty('sourceDataArchive')) {
            await esArchiver.loadIfNeeded(testData.sourceDataArchive!);
          }
          if (testData.hasOwnProperty('indexPattern')) {
            await ml.testResources.createIndexPatternIfNeeded(
              testData.indexPattern!.name as string,
              testData.indexPattern!.timeField as string
            );
          }
        });

        after(async () => {
          await ml.api.cleanMlIndices();
        });

        it(testData.testTitleSuffix, async () => {
          const rspBody = await executeSetupModuleRequest(
            testData.module,
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          expect(rspBody).to.have.property('error').eql(testData.expected.error);

          expect(rspBody).to.have.property('message').eql(testData.expected.message);
        });
      });
    }
  });
};

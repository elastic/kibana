/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Response as SupertestResponse } from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  function getRegisteredTypes() {
    return supertest
      .get(`/api/registered_tasks`)
      .expect(200)
      .then((response: SupertestResponse) => response.body);
  }

  const TEST_TYPES = [
    'sampleOneTimeTaskTimingOut',
    'sampleRecurringTaskTimingOut',
    'sampleRecurringTaskWhichHangs',
    'sampleTask',
    'sampleTaskWithLimitedConcurrency',
    'sampleTaskWithSingleConcurrency',
    'singleAttemptSampleTask',
    'taskWhichExecutesOtherTasksEphemerally',
    'timedTask',
    'timedTaskWithLimitedConcurrency',
    'timedTaskWithSingleConcurrency',
  ];

  // This test is meant to fail when any change is made in task manager registered types.
  // The intent is to trigger a code review from the Response Ops team to review the new task type changes.
  describe('check_registered_task_types', () => {
    it('should check changes on all registered task types', async () => {
      const types = (await getRegisteredTypes())
        .filter((t: string) => !TEST_TYPES.includes(t))
        .sort();
      expect(types).to.eql([
        'Fleet-Usage-Logger',
        'Fleet-Usage-Sender',
        'ML:saved-objects-sync',
        'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects',
        'actions:.cases-webhook',
        'actions:.email',
        'actions:.index',
        'actions:.jira',
        'actions:.opsgenie',
        'actions:.pagerduty',
        'actions:.resilient',
        'actions:.server-log',
        'actions:.servicenow',
        'actions:.servicenow-itom',
        'actions:.servicenow-sir',
        'actions:.slack',
        'actions:.swimlane',
        'actions:.teams',
        'actions:.tines',
        'actions:.webhook',
        'actions:.xmatters',
        'actions_telemetry',
        'alerting:.es-query',
        'alerting:.geo-containment',
        'alerting:.index-threshold',
        'alerting:apm.anomaly',
        'alerting:apm.error_rate',
        'alerting:apm.transaction_duration',
        'alerting:apm.transaction_error_rate',
        'alerting:logs.alert.document.count',
        'alerting:metrics.alert.anomaly',
        'alerting:metrics.alert.inventory.threshold',
        'alerting:metrics.alert.threshold',
        'alerting:monitoring_alert_cluster_health',
        'alerting:monitoring_alert_cpu_usage',
        'alerting:monitoring_alert_disk_usage',
        'alerting:monitoring_alert_elasticsearch_version_mismatch',
        'alerting:monitoring_alert_jvm_memory_usage',
        'alerting:monitoring_alert_kibana_version_mismatch',
        'alerting:monitoring_alert_license_expiration',
        'alerting:monitoring_alert_logstash_version_mismatch',
        'alerting:monitoring_alert_missing_monitoring_data',
        'alerting:monitoring_alert_nodes_changed',
        'alerting:monitoring_alert_thread_pool_search_rejections',
        'alerting:monitoring_alert_thread_pool_write_rejections',
        'alerting:monitoring_ccr_read_exceptions',
        'alerting:monitoring_shard_size',
        'alerting:siem.eqlRule',
        'alerting:siem.indicatorRule',
        'alerting:siem.mlRule',
        'alerting:siem.newTermsRule',
        'alerting:siem.notifications',
        'alerting:siem.queryRule',
        'alerting:siem.savedQueryRule',
        'alerting:siem.dataQualityRule',
        'alerting:siem.thresholdRule',
        'alerting:transform_health',
        'alerting:xpack.ml.anomaly_detection_alert',
        'alerting:xpack.ml.anomaly_detection_jobs_health',
        'alerting:xpack.synthetics.alerts.monitorStatus',
        'alerting:xpack.uptime.alerts.durationAnomaly',
        'alerting:xpack.uptime.alerts.monitorStatus',
        'alerting:xpack.uptime.alerts.tls',
        'alerting:xpack.uptime.alerts.tlsCertificate',
        'alerting_health_check',
        'alerting_telemetry',
        'alerts_invalidate_api_keys',
        'apm-source-map-migration-task',
        'apm-telemetry-task',
        'cases-telemetry-task',
        'cleanup_failed_action_executions',
        'cloud_security_posture-stats_task',
        'dashboard_telemetry',
        'endpoint:metadata-check-transforms-task',
        'endpoint:user-artifact-packager',
        'fleet:check-deleted-files-task',
        'fleet:reassign_action:retry',
        'fleet:request_diagnostics:retry',
        'fleet:unenroll_action:retry',
        'fleet:update_agent_tags:retry',
        'fleet:upgrade_action:retry',
        'osquery:telemetry-configs',
        'osquery:telemetry-packs',
        'osquery:telemetry-saved-queries',
        'report:execute',
        'reports:monitor',
        'security:endpoint-diagnostics',
        'security:endpoint-meta-telemetry',
        'security:telemetry-configuration',
        'security:telemetry-detection-rules',
        'security:telemetry-filterlist-artifact',
        'security:telemetry-lists',
        'security:telemetry-prebuilt-rule-alerts',
        'security:telemetry-timelines',
        'session_cleanup',
      ]);
    });
  });
}

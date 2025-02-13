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
    'sampleAdHocTaskTimingOut',
    'lowPriorityTask',
    'sampleOneTimeTaskThrowingError',
    'sampleRecurringTaskTimingOut',
    'sampleRecurringTaskWhichHangs',
    'sampleRecurringTaskThatDeletesItself',
    'sampleTask',
    'sampleTaskWithLimitedConcurrency',
    'sampleTaskWithSingleConcurrency',
    'singleAttemptSampleTask',
    'timedTask',
    'timedTaskWithLimitedConcurrency',
    'timedTaskWithSingleConcurrency',
    'taskToDisable',
  ];

  // This test is meant to fail when any change is made in task manager registered types.
  // The intent is to trigger a code review from the Response Ops team to review the new task type changes.
  describe('check_registered_task_types', () => {
    it('should check changes on all registered task types', async () => {
      const types = (await getRegisteredTypes())
        .filter((t: string) => !TEST_TYPES.includes(t))
        .sort();
      expect(types).to.eql([
        'Fleet-Metrics-Task',
        'Fleet-Usage-Logger',
        'Fleet-Usage-Sender',
        'ML:saved-objects-sync',
        'ProductDocBase:EnsureUpToDate',
        'ProductDocBase:InstallAll',
        'ProductDocBase:UninstallAll',
        'SLO:ORPHAN_SUMMARIES-CLEANUP-TASK',
        'Synthetics:Clean-Up-Package-Policies',
        'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects',
        'actions:.bedrock',
        'actions:.cases',
        'actions:.cases-webhook',
        'actions:.crowdstrike',
        'actions:.d3security',
        'actions:.email',
        'actions:.gemini',
        'actions:.gen-ai',
        'actions:.index',
        'actions:.inference',
        'actions:.jira',
        'actions:.microsoft_defender_endpoint',
        'actions:.observability-ai-assistant',
        'actions:.opsgenie',
        'actions:.pagerduty',
        'actions:.resilient',
        `actions:.sentinelone`,
        'actions:.server-log',
        'actions:.servicenow',
        'actions:.servicenow-itom',
        'actions:.servicenow-sir',
        'actions:.slack',
        'actions:.slack_api',
        'actions:.swimlane',
        'actions:.teams',
        'actions:.thehive',
        'actions:.tines',
        'actions:.torq',
        'actions:.webhook',
        'actions:.xmatters',
        'actions:connector_usage_reporting',
        'actions_telemetry',
        'ad_hoc_run-backfill',
        'alerting:.es-query',
        'alerting:.geo-containment',
        'alerting:.index-threshold',
        'alerting:apm.anomaly',
        'alerting:apm.error_rate',
        'alerting:apm.transaction_duration',
        'alerting:apm.transaction_error_rate',
        'alerting:logs.alert.document.count',
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
        'alerting:observability.rules.custom_threshold',
        'alerting:siem.eqlRule',
        'alerting:siem.esqlRule',
        'alerting:siem.indicatorRule',
        'alerting:siem.mlRule',
        'alerting:siem.newTermsRule',
        'alerting:siem.notifications',
        'alerting:siem.queryRule',
        'alerting:siem.savedQueryRule',
        'alerting:siem.thresholdRule',
        'alerting:slo.rules.burnRate',
        'alerting:transform_health',
        'alerting:xpack.ml.anomaly_detection_alert',
        'alerting:xpack.ml.anomaly_detection_jobs_health',
        'alerting:xpack.synthetics.alerts.monitorStatus',
        'alerting:xpack.synthetics.alerts.tls',
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
        'cloud_security_posture-stats_task',
        'dashboard_telemetry',
        'endpoint:complete-external-response-actions',
        'endpoint:metadata-check-transforms-task',
        'endpoint:user-artifact-packager',
        'entity_store:data_view:refresh',
        'entity_store:field_retention:enrichment',
        'fleet:bump_agent_policies',
        'fleet:check-deleted-files-task',
        'fleet:delete-unenrolled-agents-task',
        'fleet:deploy_agent_policies',
        'fleet:reassign_action:retry',
        'fleet:request_diagnostics:retry',
        'fleet:setup:upgrade_managed_package_policies',
        'fleet:sync-integrations-task',
        'fleet:unenroll-inactive-agents-task',
        'fleet:unenroll_action:retry',
        'fleet:update_agent_tags:retry',
        'fleet:upgrade_action:retry',
        'logs-data-telemetry',
        'obs-ai-assistant:knowledge-base-migration',
        'osquery:telemetry-configs',
        'osquery:telemetry-packs',
        'osquery:telemetry-saved-queries',
        'report:execute',
        'risk_engine:risk_scoring',
        'search:agentless-connectors-manager',
        'security-solution-ea-asset-criticality-ecs-migration',
        'security:endpoint-diagnostics',
        'security:endpoint-meta-telemetry',
        'security:indices-metadata-telemetry',
        'security:telemetry-configuration',
        'security:telemetry-detection-rules',
        'security:telemetry-diagnostic-timelines',
        'security:telemetry-filterlist-artifact',
        'security:telemetry-lists',
        'security:telemetry-prebuilt-rule-alerts',
        'security:telemetry-timelines',
        'session_cleanup',
        'task_manager:delete_inactive_background_task_nodes',
        'task_manager:mark_removed_tasks_as_unrecognized',
      ]);
    });
  });
}

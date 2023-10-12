/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createRegisteredRuleTypeTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  // This test is intended to fail when new rule types are registered.
  // To resolve, add the new rule type ID to this list. This will trigger
  // a CODEOWNERS review by Response Ops.
  describe('check registered rule types', () => {
    it('should list all registered rule types', async () => {
      const registeredRuleTypes = await supertest
        .get('/api/alerts_fixture/registered_rule_types')
        .expect(200)
        .then((response) => response.body);

      const ruleTypes = [
        'example.always-firing',
        'transform_health',
        '.index-threshold',
        '.geo-containment',
        '.es-query',
        'xpack.ml.anomaly_detection_alert',
        'xpack.ml.anomaly_detection_jobs_health',
        'xpack.synthetics.alerts.monitorStatus',
        'xpack.synthetics.alerts.tls',
        'xpack.uptime.alerts.monitorStatus',
        'xpack.uptime.alerts.tlsCertificate',
        'xpack.uptime.alerts.durationAnomaly',
        'xpack.uptime.alerts.tls',
        'siem.eqlRule',
        'siem.esqlRule',
        'siem.savedQueryRule',
        'siem.indicatorRule',
        'siem.mlRule',
        'siem.queryRule',
        'siem.thresholdRule',
        'siem.newTermsRule',
        'siem.notifications',
        'slo.rules.burnRate',
        'logs.alert.document.count',
        'metrics.alert.inventory.threshold',
        'metrics.alert.threshold',
        'monitoring_alert_cluster_health',
        'monitoring_alert_license_expiration',
        'monitoring_alert_cpu_usage',
        'monitoring_alert_missing_monitoring_data',
        'monitoring_alert_disk_usage',
        'monitoring_alert_thread_pool_search_rejections',
        'monitoring_alert_thread_pool_write_rejections',
        'monitoring_alert_jvm_memory_usage',
        'monitoring_alert_nodes_changed',
        'monitoring_alert_logstash_version_mismatch',
        'monitoring_alert_kibana_version_mismatch',
        'monitoring_alert_elasticsearch_version_mismatch',
        'monitoring_ccr_read_exceptions',
        'monitoring_shard_size',
        'observability.rules.custom_threshold',
        'apm.transaction_duration',
        'apm.anomaly',
        'apm.error_rate',
        'apm.transaction_error_rate',
      ];

      expect(
        registeredRuleTypes.sort().filter((ruleType: string) => !ruleType.startsWith('test.'))
      ).to.eql(ruleTypes.sort());
    });
  });
}

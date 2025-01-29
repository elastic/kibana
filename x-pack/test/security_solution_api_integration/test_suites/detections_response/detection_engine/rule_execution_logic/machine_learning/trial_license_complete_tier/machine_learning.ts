/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertestLib from 'supertest';
import url from 'url';
import {
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_PARAMETERS,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  ALERT_WORKFLOW_ASSIGNEE_IDS,
  SPACE_IDS,
  VERSION,
} from '@kbn/rule-data-utils';
import { MachineLearningRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { getMaxSignalsWarning as getMaxAlertsWarning } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
import { expect } from 'expect';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../../../lists_and_exception_lists/utils';
import {
  forceStartDatafeeds,
  getAlerts,
  getPreviewAlerts,
  previewRule,
  previewRuleWithExceptionEntries,
  setupMlModulesWithRetry,
} from '../../../../utils';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
  waitForRuleFailure,
  routeWithNamespace,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';
import { getMetricsRequest, getMetricsWithRetry } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const request = supertestLib(url.format(config.get('servers.kibana')));
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditPath = dataPathBuilder.getPath('auditbeat/hosts');
  const retry = getService('retry');

  const siemModule = 'security_linux_v3';
  const mlJobId = 'v3_linux_anomalous_network_activity';
  const rule: MachineLearningRuleCreateProps = {
    name: 'Test ML rule',
    description: 'Test ML rule description',
    risk_score: 50,
    severity: 'critical',
    type: 'machine_learning',
    anomaly_threshold: 30,
    machine_learning_job_id: mlJobId,
    from: '1900-01-01T00:00:00.000Z',
    rule_id: 'ml-rule-id',
  };

  // Note: This suite of tests can be a candidate for the Kibana QA quality gate once the tests are passing consistenly on the periodic pipeline.
  describe('@ess @serverless Machine learning type rules', () => {
    before(async () => {
      // Order is critical here: auditbeat data must be loaded before attempting to start the ML job,
      // as the job looks for certain indices on start
      await esArchiver.load(auditPath);
      await setupMlModulesWithRetry({ module: siemModule, supertest, retry });
      await forceStartDatafeeds({ jobId: mlJobId, rspCode: 200, supertest });
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/anomalies');
    });

    after(async () => {
      await esArchiver.unload(auditPath);
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/anomalies');
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    // First test creates a real rule - remaining tests use preview API
    it('should create 1 alert from ML rule when record meets anomaly_threshold', async () => {
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getAlerts(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).toBe(1);
      const alert = alerts.hits.hits[0];

      expect(alert._source).toEqual(
        expect.objectContaining({
          '@timestamp': expect.any(String),
          [ALERT_RULE_EXECUTION_UUID]: expect.any(String),
          [ALERT_UUID]: expect.any(String),
          [VERSION]: expect.any(String),
          actual: [1],
          bucket_span: expect.any(Number),
          by_field_name: 'process.name',
          by_field_value: 'store',
          detector_index: 0,
          function: 'rare',
          function_description: 'rare',
          influencers: expect.any(Array),
          initial_record_score: expect.any(Number),
          is_interim: false,
          job_id: 'v3_linux_anomalous_network_activity',
          multi_bucket_impact: expect.any(Number),
          probability: expect.any(Number),
          record_score: expect.any(Number),
          result_type: 'record',
          timestamp: expect.any(Number),
          typical: expect.arrayContaining([expect.any(Number)]),
          user: { name: ['root'] },
          process: { name: ['store'] },
          host: { name: ['mothra'] },
          'event.kind': 'signal',
          [ALERT_ANCESTORS]: expect.any(Array),
          [ALERT_WORKFLOW_STATUS]: 'open',
          [ALERT_WORKFLOW_TAGS]: [],
          [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
          [ALERT_STATUS]: 'active',
          [SPACE_IDS]: ['default'],
          [ALERT_SEVERITY]: 'critical',
          [ALERT_RISK_SCORE]: 50,
          [ALERT_RULE_PARAMETERS]: expect.objectContaining({
            anomaly_threshold: 30,
            author: [],
            description: 'Test ML rule description',
            exceptions_list: [],
            false_positives: [],
            from: '1900-01-01T00:00:00.000Z',
            immutable: false,
            machine_learning_job_id: ['v3_linux_anomalous_network_activity'],
            max_signals: 100,
            references: [],
            related_integrations: [],
            required_fields: [],
            risk_score: 50,
            risk_score_mapping: [],
            rule_id: 'ml-rule-id',
            setup: '',
            severity: 'critical',
            severity_mapping: [],
            threat: [],
            to: 'now',
            type: 'machine_learning',
            version: 1,
          }),
          [ALERT_DEPTH]: 1,
          [ALERT_REASON]: `event with process store, by root on mothra created critical alert Test ML rule.`,
          [ALERT_ORIGINAL_TIME]: expect.any(String),
          all_field_values: expect.arrayContaining([
            'v3_linux_anomalous_network_activity',
            'root',
            'store',
            'mothra',
          ]),
        })
      );
    });

    it('@skipInServerlessMKI classifies ml job missing errors as user errors', async () => {
      await getMetricsRequest(request, true);
      const badRule: MachineLearningRuleCreateProps = {
        ...rule,
        machine_learning_job_id: 'doesNotExist',
      };
      const createdRule = await createRule(supertest, log, badRule);
      await waitForRuleFailure({ supertest, log, id: createdRule.id });

      const route = routeWithNamespace(DETECTION_ENGINE_RULES_URL);
      const response = await supertest
        .get(route)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .query({ id: createdRule.id })
        .expect(200);

      const ruleResponse = response.body;
      expect(ruleResponse.execution_summary.last_execution.message.includes('missing')).toEqual(
        true
      );

      const metricsResponse = await getMetricsWithRetry(
        request,
        retry,
        false,
        (metrics) =>
          metrics.metrics?.task_run?.value.by_type['alerting:siem__mlRule'].user_errors === 1
      );
      expect(metricsResponse.metrics?.task_run?.value.by_type['alerting:siem__mlRule']).toEqual(
        expect.objectContaining({ user_errors: 1 })
      );
    });

    it('@skipInServerlessMKI generates max alerts warning when circuit breaker is exceeded', async () => {
      const { logs } = await previewRule({
        supertest,
        rule: { ...rule, anomaly_threshold: 1, max_signals: 5 }, // This threshold generates 10 alerts with the current esArchive
      });
      expect(logs[0].warnings).toContain(getMaxAlertsWarning());
    });

    it("doesn't generate max alerts warning when circuit breaker is met, but not exceeded", async () => {
      const { logs } = await previewRule({
        supertest,
        rule: { ...rule, anomaly_threshold: 1, max_signals: 10 },
      });
      expect(logs[0].warnings).not.toContain(getMaxAlertsWarning());
    });

    it('@skipInServerlessMKI should create 7 alerts from ML rule when records meet anomaly_threshold', async () => {
      const { previewId } = await previewRule({
        supertest,
        rule: { ...rule, anomaly_threshold: 20 },
      });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toBe(7);
    });

    describe('with non-value list exception', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });
      it('generates no alerts when an exception is added for an ML rule', async () => {
        const { previewId } = await previewRuleWithExceptionEntries({
          supertest,
          log,
          rule,
          entries: [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'match',
                value: 'mothra',
              },
            ],
          ],
        });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).toBe(0);
      });
    });

    describe('with value list exception', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest, log);
        await deleteAllExceptions(supertest, log);
      });

      it('generates no alerts when a value list exception is added for an ML rule', async () => {
        const valueListId = 'value-list-id.txt';
        await importFile(supertest, log, 'keyword', ['mothra'], valueListId);
        const { previewId } = await previewRuleWithExceptionEntries({
          supertest,
          log,
          rule,
          entries: [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'list',
                list: {
                  id: valueListId,
                  type: 'keyword',
                },
              },
            ],
          ],
        });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).toBe(0);
      });
    });

    describe('alerts should be be enriched', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/risks');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/risks');
      });

      it('@skipInServerlessMKI should be enriched with host risk score', async () => {
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).toBe(1);
        const fullAlert = previewAlerts[0]._source;

        expect(fullAlert?.host?.risk?.calculated_level).toBe('Low');
        expect(fullAlert?.host?.risk?.calculated_score_norm).toBe(1);
      });
    });

    describe('with asset criticality', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/asset_criticality');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/asset_criticality');
      });

      it('@skipInServerlessMKI should be enriched alert with criticality_level', async () => {
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts).toHaveLength(1);
        expect(previewAlerts[0]._source).toEqual(
          expect.objectContaining({
            'user.asset.criticality': 'extreme_impact',
          })
        );
      });
    });

    describe('preview logged requests', () => {
      it('should not return requests property when not enabled', async () => {
        const { logs } = await previewRule({
          supertest,
          rule,
        });

        expect(logs[0].requests).toEqual(undefined);
      });
      it('should return requests property when enable_logged_requests set to true', async () => {
        const { logs } = await previewRule({
          supertest,
          rule,
          enableLoggedRequests: true,
        });

        const requests = logs[0].requests;

        expect(requests).toHaveLength(1);
        expect(requests![0].description).toBe('Find all anomalies');
        expect(requests![0].request).toContain('POST /.ml-anomalies-*/_search');
      });
    });
  });
};

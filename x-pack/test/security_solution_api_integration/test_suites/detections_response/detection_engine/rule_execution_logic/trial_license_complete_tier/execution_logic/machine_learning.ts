/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { ENABLE_ASSET_CRITICALITY_SETTING } from '@kbn/security-solution-plugin/common/constants';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../../../lists_and_exception_lists/utils';
import {
  executeSetupModuleRequest,
  forceStartDatafeeds,
  getAlerts,
  getPreviewAlerts,
  previewRule,
  previewRuleWithExceptionEntries,
} from '../../../../utils';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditPath = dataPathBuilder.getPath('auditbeat/hosts');

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

  // FLAKY: https://github.com/elastic/kibana/issues/171426
  describe.skip('@ess @serverless Machine learning type rules', () => {
    before(async () => {
      // Order is critical here: auditbeat data must be loaded before attempting to start the ML job,
      // as the job looks for certain indices on start
      await esArchiver.load(auditPath);
      await executeSetupModuleRequest({ module: siemModule, rspCode: 200, supertest });
      await forceStartDatafeeds({ jobId: mlJobId, rspCode: 200, supertest });
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/anomalies');
    });
    after(async () => {
      await esArchiver.unload(auditPath);
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/anomalies');
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
          [ALERT_RULE_PARAMETERS]: {
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
          },
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

    it('@skipInQA generates max alerts warning when circuit breaker is exceeded', async () => {
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

    it('@skipInQA should create 7 alerts from ML rule when records meet anomaly_threshold', async () => {
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

      it('@skipInQA should be enriched with host risk score', async () => {
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).toBe(1);
        const fullAlert = previewAlerts[0]._source;

        expect(fullAlert?.host?.risk?.calculated_level).toBe('Low');
        expect(fullAlert?.host?.risk?.calculated_score_norm).toBe(1);
      });
    });

    describe('with asset criticality', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/asset_criticality');
        await kibanaServer.uiSettings.update({
          [ENABLE_ASSET_CRITICALITY_SETTING]: true,
        });
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/asset_criticality');
      });

      it('should be enriched alert with criticality_level', async () => {
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).toBe(1);
        const fullAlert = previewAlerts[0]._source;

        expect(fullAlert?.['host.asset.criticality']).toBe('medium_impact');
        expect(fullAlert?.['user.asset.criticality']).toBe('extreme_impact');
      });
    });
  });
};

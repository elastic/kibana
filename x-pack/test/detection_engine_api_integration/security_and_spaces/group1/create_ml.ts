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
  SPACE_IDS,
  VERSION,
} from '@kbn/rule-data-utils';
import { MachineLearningRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import expect from 'expect';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../lists_api_integration/utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createRuleWithExceptionEntries,
  deleteAllAlerts,
  getOpenSignals,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const siemModule = 'security_linux_v3';
  const mlJobId = 'v3_linux_anomalous_network_activity';
  const testRule: MachineLearningRuleCreateProps = {
    name: 'Test ML rule',
    description: 'Test ML rule description',
    risk_score: 50,
    severity: 'critical',
    type: 'machine_learning',
    anomaly_threshold: 30,
    machine_learning_job_id: mlJobId,
    from: '1900-01-01T00:00:00.000Z',
  };

  async function executeSetupModuleRequest(module: string, rspCode: number) {
    const { body } = await supertest
      .post(`/api/ml/modules/setup/${module}`)
      .set('kbn-xsrf', 'true')
      .send({
        prefix: '',
        groups: ['auditbeat'],
        indexPatternName: 'auditbeat-*',
        startDatafeed: false,
        useDedicatedIndex: true,
        applyToAllSpaces: true,
      })
      .expect(rspCode);

    return body;
  }

  async function forceStartDatafeeds(jobId: string, rspCode: number) {
    const { body } = await supertest
      .post(`/api/ml/jobs/force_start_datafeeds`)
      .set('kbn-xsrf', 'true')
      .send({
        datafeedIds: [`datafeed-${jobId}`],
        start: new Date().getUTCMilliseconds(),
      })
      .expect(rspCode);

    return body;
  }

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/125033
  // FLAKY: https://github.com/elastic/kibana/issues/142993
  describe.skip('Generating signals from ml anomalies', () => {
    before(async () => {
      // Order is critical here: auditbeat data must be loaded before attempting to start the ML job,
      // as the job looks for certain indices on start
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      await executeSetupModuleRequest(siemModule, 200);
      await forceStartDatafeeds(mlJobId, 200);
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/anomalies');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/anomalies');
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log);
    });

    it('should create 1 alert from ML rule when record meets anomaly_threshold', async () => {
      const createdRule = await createRule(supertest, log, testRule);
      const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
      expect(signalsOpen.hits.hits.length).toBe(1);
      const signal = signalsOpen.hits.hits[0];

      expect(signal._source).toEqual(
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
            rule_id: createdRule.rule_id,
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

    it('should create 7 alerts from ML rule when records meet anomaly_threshold', async () => {
      const rule: MachineLearningRuleCreateProps = {
        ...testRule,
        anomaly_threshold: 20,
      };
      const createdRule = await createRule(supertest, log, rule);
      const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
      expect(signalsOpen.hits.hits.length).toBe(7);
    });

    describe('with non-value list exception', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });
      it('generates no signals when an exception is added for an ML rule', async () => {
        const createdRule = await createRuleWithExceptionEntries(supertest, log, testRule, [
          [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'mothra',
            },
          ],
        ]);
        const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
        expect(signalsOpen.hits.hits.length).toBe(0);
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

      it('generates no signals when a value list exception is added for an ML rule', async () => {
        const valueListId = 'value-list-id';
        await importFile(supertest, log, 'keyword', ['mothra'], valueListId);
        const createdRule = await createRuleWithExceptionEntries(supertest, log, testRule, [
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
        ]);
        const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
        expect(signalsOpen.hits.hits.length).toBe(0);
      });
    });

    describe('alerts should be be enriched', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/host_risk');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/host_risk');
      });

      it('should be enriched with host risk score', async () => {
        const createdRule = await createRule(supertest, log, testRule);
        const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
        expect(signalsOpen.hits.hits.length).toBe(1);
        const fullSignal = signalsOpen.hits.hits[0]._source;

        expect(fullSignal?.host?.risk?.calculated_level).toBe('Low');
        expect(fullSignal?.host?.risk?.calculated_score_norm).toBe(1);
      });
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ALERT_REASON,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_UPDATED_AT,
  ALERT_SEVERITY,
  ALERT_RISK_SCORE,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
  VERSION,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { MachineLearningCreateSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createRuleWithExceptionEntries,
  deleteAllAlerts,
  getOpenSignals,
} from '../../utils';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../lists_api_integration/utils';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
} from '../../../../plugins/security_solution/common/field_maps/field_names';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const siemModule = 'siem_auditbeat';
  const mlJobId = 'linux_anomalous_network_activity_ecs';
  const testRule: MachineLearningCreateSchema = {
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

  describe('Generating signals from ml anomalies', () => {
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

    it.skip('should create 1 alert from ML rule when record meets anomaly_threshold', async () => {
      const createdRule = await createRule(supertest, log, testRule);
      const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
      expect(signalsOpen.hits.hits.length).eql(1);
      const signal = signalsOpen.hits.hits[0];
      if (!signal._source) {
        return expect(signal._source).to.be.ok();
      }

      expect(signal._source).eql({
        '@timestamp': signal._source['@timestamp'],
        [ALERT_RULE_EXECUTION_UUID]: signal._source[ALERT_RULE_EXECUTION_UUID],
        [ALERT_UUID]: signal._source[ALERT_UUID],
        [VERSION]: signal._source[VERSION],
        actual: [1],
        bucket_span: 900,
        by_field_name: 'process.name',
        by_field_value: 'store',
        detector_index: 0,
        function: 'rare',
        function_description: 'rare',
        influencers: [
          { influencer_field_name: 'user.name', influencer_field_values: ['root'] },
          { influencer_field_name: 'process.name', influencer_field_values: ['store'] },
          { influencer_field_name: 'host.name', influencer_field_values: ['mothra'] },
        ],
        initial_record_score: 33.36147565024334,
        is_interim: false,
        job_id: 'linux_anomalous_network_activity_ecs',
        multi_bucket_impact: 0,
        probability: 0.007820139656036713,
        record_score: 33.36147565024334,
        result_type: 'record',
        timestamp: 1605567488000,
        typical: [0.007820139656036711],
        user: { name: ['root'] },
        process: { name: ['store'] },
        host: { name: ['mothra'] },
        'event.kind': 'signal',
        [ALERT_ANCESTORS]: [
          {
            id: 'linux_anomalous_network_activity_ecs_record_1586274300000_900_0_-96106189301704594950079884115725560577_5',
            type: 'event',
            index: '.ml-anomalies-custom-linux_anomalous_network_activity_ecs',
            depth: 0,
          },
        ],
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
          machine_learning_job_id: ['linux_anomalous_network_activity_ecs'],
          max_signals: 100,
          references: [],
          risk_score: 50,
          risk_score_mapping: [],
          rule_id: createdRule.rule_id,
          severity: 'critical',
          severity_mapping: [],
          threat: [],
          to: 'now',
          type: 'machine_learning',
          version: 1,
        },
        ...flattenWithPrefix(ALERT_RULE_NAMESPACE, {
          uuid: createdRule.id,
          category: 'Machine Learning Rule',
          consumer: 'siem',
          producer: 'siem',
          rule_id: createdRule.rule_id,
          rule_type_id: 'siem.mlRule',
          created_at: createdRule.created_at,
          updated_at: signal._source?.[ALERT_RULE_UPDATED_AT],
          actions: [],
          interval: '5m',
          name: 'Test ML rule',
          tags: [],
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
          description: 'Test ML rule description',
          risk_score: 50,
          severity: 'critical',
          author: [],
          false_positives: [],
          from: '1900-01-01T00:00:00.000Z',
          max_signals: 100,
          risk_score_mapping: [],
          severity_mapping: [],
          threat: [],
          to: 'now',
          references: [],
          version: 1,
          exceptions_list: [],
          immutable: false,
          type: 'machine_learning',
        }),
        [ALERT_DEPTH]: 1,
        [ALERT_REASON]: `event with process store, by root on mothra created critical alert Test ML rule.`,
        [ALERT_ORIGINAL_TIME]: '2020-11-16T22:58:08.000Z',
        all_field_values: [
          'store',
          'linux_anomalous_network_activity_ecs',
          'root',
          'store',
          'mothra',
        ],
      });
    });

    it.skip('should create 7 alerts from ML rule when records meet anomaly_threshold', async () => {
      const rule: MachineLearningCreateSchema = {
        ...testRule,
        anomaly_threshold: 20,
      };
      const createdRule = await createRule(supertest, log, rule);
      const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
      expect(signalsOpen.hits.hits.length).eql(7);
    });

    describe('with non-value list exception', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });
      it.skip('generates no signals when an exception is added for an ML rule', async () => {
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
        expect(signalsOpen.hits.hits.length).equal(0);
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

      it.skip('generates no signals when a value list exception is added for an ML rule', async () => {
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
        expect(signalsOpen.hits.hits.length).equal(0);
      });
    });
  });
};

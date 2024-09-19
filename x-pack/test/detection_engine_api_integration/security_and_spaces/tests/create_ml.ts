/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { MachineLearningCreateSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createRuleWithExceptionEntries,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getOpenSignals,
} from '../../utils';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../lists_api_integration/utils';
import { SIGNALS_TEMPLATE_VERSION } from '../../../../plugins/security_solution/server/lib/detection_engine/routes/index/get_signals_template';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
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

    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });
    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
    });

    it('should create 1 alert from ML rule when record meets anomaly_threshold', async () => {
      const createdRule = await createRule(supertest, testRule);
      const signalsOpen = await getOpenSignals(supertest, es, createdRule);
      expect(signalsOpen.hits.hits.length).eql(1);
      const signal = signalsOpen.hits.hits[0];
      if (!signal._source) {
        return expect(signal._source).to.be.ok();
      }

      expect(signal._source).eql({
        '@timestamp': signal._source['@timestamp'],
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
        event: { kind: 'signal' },
        signal: {
          _meta: { version: SIGNALS_TEMPLATE_VERSION },
          parents: [
            {
              id: 'linux_anomalous_network_activity_ecs_record_1586274300000_900_0_-96106189301704594950079884115725560577_5',
              type: 'event',
              index: '.ml-anomalies-custom-linux_anomalous_network_activity_ecs',
              depth: 0,
            },
          ],
          ancestors: [
            {
              id: 'linux_anomalous_network_activity_ecs_record_1586274300000_900_0_-96106189301704594950079884115725560577_5',
              type: 'event',
              index: '.ml-anomalies-custom-linux_anomalous_network_activity_ecs',
              depth: 0,
            },
          ],
          status: 'open',
          rule: {
            id: createdRule.id,
            rule_id: createdRule.rule_id,
            created_at: createdRule.created_at,
            updated_at: signal._source?.signal.rule.updated_at,
            actions: [],
            interval: '5m',
            name: 'Test ML rule',
            tags: [],
            enabled: true,
            created_by: 'elastic',
            updated_by: 'elastic',
            throttle: null,
            description: 'Test ML rule description',
            risk_score: 50,
            severity: 'critical',
            output_index: '.siem-signals-default',
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
            anomaly_threshold: 30,
            machine_learning_job_id: ['linux_anomalous_network_activity_ecs'],
          },
          depth: 1,
          parent: {
            id: 'linux_anomalous_network_activity_ecs_record_1586274300000_900_0_-96106189301704594950079884115725560577_5',
            type: 'event',
            index: '.ml-anomalies-custom-linux_anomalous_network_activity_ecs',
            depth: 0,
          },
          reason: `event with process store, by root on mothra created critical alert Test ML rule.`,
          original_time: '2020-11-16T22:58:08.000Z',
        },
        all_field_values: [
          'store',
          'linux_anomalous_network_activity_ecs',
          'root',
          'store',
          'mothra',
        ],
      });
    });

    it('should create 7 alerts from ML rule when records meet anomaly_threshold', async () => {
      const rule: MachineLearningCreateSchema = {
        ...testRule,
        anomaly_threshold: 20,
      };
      const createdRule = await createRule(supertest, rule);
      const signalsOpen = await getOpenSignals(supertest, es, createdRule);
      expect(signalsOpen.hits.hits.length).eql(7);
    });
    describe('with non-value list exception', () => {
      afterEach(async () => {
        await deleteAllExceptions(es);
      });
      it('generates no signals when an exception is added for an ML rule', async () => {
        const createdRule = await createRuleWithExceptionEntries(supertest, testRule, [
          [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'mothra',
            },
          ],
        ]);
        const signalsOpen = await getOpenSignals(supertest, es, createdRule);
        expect(signalsOpen.hits.hits.length).equal(0);
      });
    });

    describe('with value list exception', () => {
      beforeEach(async () => {
        await createListsIndex(supertest);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest);
        await deleteAllExceptions(es);
      });

      it('generates no signals when a value list exception is added for an ML rule', async () => {
        const valueListId = 'value-list-id';
        await importFile(supertest, 'keyword', ['mothra'], valueListId);
        const createdRule = await createRuleWithExceptionEntries(supertest, testRule, [
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
        const signalsOpen = await getOpenSignals(supertest, es, createdRule);
        expect(signalsOpen.hits.hits.length).equal(0);
      });
    });
  });
};

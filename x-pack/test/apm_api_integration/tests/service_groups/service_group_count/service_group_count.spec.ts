/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { waitForActiveAlert } from '../../../common/utils/wait_for_active_alert';
import { generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const esClient = getService('es');
  const log = getService('log');
  const start = Date.now() - 24 * 60 * 60 * 1000;
  const end = Date.now();

  async function getServiceGroupCounts() {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/service-group/counts',
    });
  }

  async function saveServiceGroup({
    serviceGroupId,
    groupName,
    kuery,
    description,
    color,
  }: {
    serviceGroupId?: string;
    groupName: string;
    kuery: string;
    description?: string;
    color?: string;
  }) {
    return apmApiClient.writeUser({
      endpoint: 'POST /internal/apm/service-group',
      params: {
        query: {
          serviceGroupId,
        },
        body: {
          groupName,
          kuery,
          description,
          color,
        },
      },
    });
  }

  async function getServiceGroupsApi() {
    return apmApiClient.writeUser({
      endpoint: 'GET /internal/apm/service-groups',
    });
  }

  async function deleteAllServiceGroups() {
    return await getServiceGroupsApi().then((response) => {
      const promises = response.body.serviceGroups.map((item) => {
        if (item.id) {
          return apmApiClient.writeUser({
            endpoint: 'DELETE /internal/apm/service-group',
            params: { query: { serviceGroupId: item.id } },
          });
        }
      });
      return Promise.all(promises);
    });
  }

  async function createRule() {
    return supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'true')
      .send({
        params: {
          serviceName: 'synth-go',
          transactionType: '',
          windowSize: 99,
          windowUnit: 'y',
          threshold: 100,
          aggregationType: 'avg',
          environment: 'testing',
        },
        consumer: 'apm',
        schedule: { interval: '1m' },
        tags: ['apm'],
        name: 'Latency threshold | synth-go',
        rule_type_id: ApmRuleType.TransactionDuration,
        notify_when: 'onActiveAlert',
        actions: [],
      });
  }

  registry.when(
    'Service group counts',
    { config: 'basic', archives: [] },
    () => {
      let synthbeansServiceGroupId: string;
      let opbeansServiceGroupId: string;
      before(async () => {
        const [, { body: synthbeansServiceGroup }, { body: opbeansServiceGroup }] =
          await Promise.all([
            generateData({ start, end, synthtraceEsClient }),
            saveServiceGroup({
              groupName: 'synthbeans',
              kuery: 'service.name: synth*',
            }),
            saveServiceGroup({
              groupName: 'opbeans',
              kuery: 'service.name: opbeans*',
            }),
          ]);
        synthbeansServiceGroupId = synthbeansServiceGroup.id;
        opbeansServiceGroupId = opbeansServiceGroup.id;
      });

      after(async () => {
        await deleteAllServiceGroups();
        await synthtraceEsClient.clean();
      });

      it('returns the correct number of services', async () => {
        const response = await getServiceGroupCounts();
        expect(response.status).to.be(200);
        expect(Object.keys(response.body).length).to.be(2);
        expect(response.body[synthbeansServiceGroupId]).to.have.property('services', 2);
        expect(response.body[opbeansServiceGroupId]).to.have.property('services', 1);
      });

      describe('with alerts', () => {
        let ruleId: string;
        before(async () => {
          const { body: createdRule } = await createRule();
          ruleId = createdRule.id;
          await waitForActiveAlert({ ruleId, esClient, log });
        });

        after(async () => {
          await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'true');
          await esDeleteAllIndices('.alerts*');
        });

        it('returns the correct number of alerts', async () => {
          const response = await getServiceGroupCounts();
          expect(response.status).to.be(200);
          expect(Object.keys(response.body).length).to.be(2);
          expect(response.body[synthbeansServiceGroupId]).to.have.property('alerts', 1);
          expect(response.body[opbeansServiceGroupId]).to.have.property('alerts', 0);
        });
      });
    },
    true // skipped Failing: See https://github.com/elastic/kibana/issues/147473
  );
}

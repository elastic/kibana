/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { SearchResponse } from 'elasticsearch';
import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_STATUS_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getQueryAllSignals,
  removeServerGeneratedProperties,
  waitFor,
} from '../../utils';

import { getCreateThreatMatchRulesSchemaMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/request/create_rules_schema.mock';
import { getThreatMatchingSchemaPartialMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema.mocks';
import { Signal } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  /**
   * Specific api integration tests for threat matching rule type
   */
  describe('create_threat_matching', () => {
    describe('validation errors', () => {
      it('should give an error that the index must exist first if it does not exist before creating a rule', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateThreatMatchRulesSchemaMock())
          .expect(400);

        expect(body).to.eql({
          message:
            'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
          status_code: 400,
        });
      });
    });

    describe('creating threat match rule', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
      });

      it('should create a single rule with a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateThreatMatchRulesSchemaMock())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getThreatMatchingSchemaPartialMock());
      });

      it('should create a single rule with a rule_id and validate it ran successfully', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateThreatMatchRulesSchemaMock())
          .expect(200);

        // wait for Task Manager to execute the rule and update status
        await waitFor(async () => {
          const { body: statusBody } = await supertest
            .post(DETECTION_ENGINE_RULES_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send({ ids: [body.id] })
            .expect(200);

          return statusBody[body.id]?.current_status?.status === 'succeeded';
        });

        const { body: statusBody } = await supertest
          .post(DETECTION_ENGINE_RULES_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: [body.id] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getThreatMatchingSchemaPartialMock());
        expect(statusBody[body.id].current_status.status).to.eql('succeeded');
      });
    });

    describe('tests with auditbeat data', () => {
      beforeEach(async () => {
        await deleteAllAlerts(es);
        await createSignalsIndex(supertest);
        await esArchiver.load('auditbeat/hosts');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
        await esArchiver.unload('auditbeat/hosts');
      });

      it('should be able to execute and get 10 signals when doing a specific query', async () => {
        const rule: CreateRulesSchema = {
          ...getCreateThreatMatchRulesSchemaMock(),
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
          threat_query: 'source.ip: "188.166.120.93"', // narrow things down with a query to a specific source ip
          threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
          threat_mapping: [
            // We match host.name against host.name
            {
              entries: [
                {
                  field: 'host.name',
                  value: 'host.name',
                  type: 'mapping',
                },
              ],
            },
          ],
          threat_filters: [],
        };

        // create a simple rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(rule)
          .expect(200);

        // wait until rules show up and are present
        await waitFor(async () => {
          const {
            body: signalsOpen,
          }: { body: SearchResponse<{ signal: Signal }> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAllSignals())
            .expect(200);
          return signalsOpen.hits.hits.length > 0;
        });

        const {
          body: signalsOpen,
        }: { body: SearchResponse<{ signal: Signal }> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQueryAllSignals())
          .expect(200);

        // expect there to be 10
        expect(signalsOpen.hits.hits.length).equal(10);
      });

      it('should return zero matches if the mapping does not match against anything in the mapping', async () => {
        const rule: CreateRulesSchema = {
          ...getCreateThreatMatchRulesSchemaMock(),
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
          threat_query: 'source.ip: "188.166.120.93"', // narrow things down with a query to a specific source ip
          threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
          threat_mapping: [
            // We match host.name against host.name
            {
              entries: [
                {
                  field: 'host.name',
                  value: 'invalid.mapping.value', // invalid mapping value
                  type: 'mapping',
                },
              ],
            },
          ],
          threat_filters: [],
        };

        // create the threat match rule
        const { body: resBody } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(rule)
          .expect(200);

        // wait for Task Manager to finish executing the rule
        await waitFor(async () => {
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
            .set('kbn-xsrf', 'true')
            .send({ ids: [resBody.id] })
            .expect(200);
          return body[resBody.id]?.current_status?.status === 'succeeded';
        });

        // Get the signals now that we are done running and expect the result to always be zero
        const {
          body: signalsOpen,
        }: { body: SearchResponse<{ signal: Signal }> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQueryAllSignals())
          .expect(200);

        expect(signalsOpen.hits.hits.length).equal(0);
      });
    });
  });
};

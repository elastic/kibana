/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request/rule_schemas';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_STATUS_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getAllSignals,
  removeServerGeneratedProperties,
  waitForRuleSuccess,
  waitForSignalsToBePresent,
} from '../../utils';

import { getCreateThreatMatchRulesSchemaMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/request/rule_schemas.mock';
import { getThreatMatchingSchemaPartialMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema.mocks';

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
        const ruleResponse = await createRule(supertest, getCreateThreatMatchRulesSchemaMock());
        const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
        expect(bodyToCompare).to.eql(getThreatMatchingSchemaPartialMock());
      });

      it('should create a single rule with a rule_id and validate it ran successfully', async () => {
        const ruleResponse = await createRule(supertest, getCreateThreatMatchRulesSchemaMock());
        await waitForRuleSuccess(supertest, ruleResponse.id);

        const { body: statusBody } = await supertest
          .post(DETECTION_ENGINE_RULES_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: [ruleResponse.id] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
        expect(bodyToCompare).to.eql(getThreatMatchingSchemaPartialMock());
        expect(statusBody[ruleResponse.id].current_status.status).to.eql('succeeded');
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
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          type: 'threat_match',
          risk_score: 55,
          language: 'kuery',
          rule_id: 'rule-1',
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

        await createRule(supertest, rule);
        await waitForSignalsToBePresent(supertest, 10);
        const signalsOpen = await getAllSignals(supertest);
        expect(signalsOpen.hits.hits.length).equal(10);
      });

      it('should return 0 matches if the mapping does not match against anything in the mapping', async () => {
        const rule: CreateRulesSchema = {
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          type: 'threat_match',
          risk_score: 55,
          language: 'kuery',
          rule_id: 'rule-1',
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

        const ruleResponse = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, ruleResponse.id);
        const signalsOpen = await getAllSignals(supertest);
        expect(signalsOpen.hits.hits.length).equal(0);
      });

      it('should return 0 signals when using an AND and one of the clauses does not have data', async () => {
        const rule: CreateRulesSchema = {
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          type: 'threat_match',
          risk_score: 55,
          language: 'kuery',
          rule_id: 'rule-1',
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
          threat_query: 'source.ip: "188.166.120.93"', // narrow things down with a query to a specific source ip
          threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
          threat_mapping: [
            {
              entries: [
                {
                  field: 'source.ip',
                  value: 'source.ip',
                  type: 'mapping',
                },
                {
                  field: 'source.ip',
                  value: 'destination.ip', // All records from the threat query do NOT have destination.ip, so those records that do not should drop this entire AND clause.
                  type: 'mapping',
                },
              ],
            },
          ],
          threat_filters: [],
        };

        const ruleResponse = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, ruleResponse.id);
        const signalsOpen = await getAllSignals(supertest);
        expect(signalsOpen.hits.hits.length).equal(0);
      });

      it('should return 0 signals when using an AND and one of the clauses has a made up value that does not exist', async () => {
        const rule: CreateRulesSchema = {
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          type: 'threat_match',
          risk_score: 55,
          language: 'kuery',
          rule_id: 'rule-1',
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
          threat_query: 'source.ip: "188.166.120.93"', // narrow things down with a query to a specific source ip
          threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
          threat_mapping: [
            {
              entries: [
                {
                  field: 'source.ip',
                  value: 'source.ip',
                  type: 'mapping',
                },
                {
                  field: 'source.ip',
                  value: 'made.up.non.existent.field', // made up field should not match
                  type: 'mapping',
                },
              ],
            },
          ],
          threat_filters: [],
        };

        const ruleResponse = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, ruleResponse.id);
        const signalsOpen = await getAllSignals(supertest);
        expect(signalsOpen.hits.hits.length).equal(0);
      });
    });
  });
};

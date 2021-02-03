/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
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
  getSignalsByIds,
  removeServerGeneratedProperties,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

import { getCreateThreatMatchRulesSchemaMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/request/rule_schemas.mock';
import { getThreatMatchingSchemaPartialMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema.mocks';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

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
        await esArchiver.load('auditbeat/hosts');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('auditbeat/hosts');
      });

      it('should create a single rule with a rule_id', async () => {
        const ruleResponse = await createRule(supertest, getCreateThreatMatchRulesSchemaMock());
        const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
        expect(bodyToCompare).to.eql(getThreatMatchingSchemaPartialMock());
      });

      it('should create a single rule with a rule_id and validate it ran successfully', async () => {
        const ruleResponse = await createRule(
          supertest,
          getCreateThreatMatchRulesSchemaMock('rule-1', true)
        );

        await waitForRuleSuccessOrStatus(supertest, ruleResponse.id, 'succeeded');

        const { body: statusBody } = await supertest
          .post(DETECTION_ENGINE_RULES_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: [ruleResponse.id] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
        expect(bodyToCompare).to.eql(getThreatMatchingSchemaPartialMock(true));
        expect(statusBody[ruleResponse.id].current_status.status).to.eql('succeeded');
      });
    });

    describe('tests with auditbeat data', () => {
      beforeEach(async () => {
        await deleteAllAlerts(supertest);
        await createSignalsIndex(supertest);
        await esArchiver.load('auditbeat/hosts');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('auditbeat/hosts');
      });

      it('should be able to execute and get 10 signals when doing a specific query', async () => {
        const rule: CreateRulesSchema = {
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          index: ['auditbeat-*'],
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

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 10, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits.length).equal(10);
      });

      it('should return 0 matches if the mapping does not match against anything in the mapping', async () => {
        const rule: CreateRulesSchema = {
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          index: ['auditbeat-*'],
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
        await waitForRuleSuccessOrStatus(supertest, ruleResponse.id);
        const signalsOpen = await getSignalsByIds(supertest, [ruleResponse.id]);
        expect(signalsOpen.hits.hits.length).equal(0);
      });

      it('should return 0 signals when using an AND and one of the clauses does not have data', async () => {
        const rule: CreateRulesSchema = {
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          index: ['auditbeat-*'],
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
        await waitForRuleSuccessOrStatus(supertest, ruleResponse.id);
        const signalsOpen = await getSignalsByIds(supertest, [ruleResponse.id]);
        expect(signalsOpen.hits.hits.length).equal(0);
      });

      it('should return 0 signals when using an AND and one of the clauses has a made up value that does not exist', async () => {
        const rule: CreateRulesSchema = {
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          type: 'threat_match',
          index: ['auditbeat-*'],
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
        await waitForRuleSuccessOrStatus(supertest, ruleResponse.id);
        const signalsOpen = await getSignalsByIds(supertest, [ruleResponse.id]);
        expect(signalsOpen.hits.hits.length).equal(0);
      });

      describe('indicator enrichment', () => {
        beforeEach(async () => {
          await esArchiver.load('filebeat/threat_intel');
        });

        afterEach(async () => {
          await esArchiver.unload('filebeat/threat_intel');
        });

        it('enriches signals with the single indicator that matched', async () => {
          const rule: CreateRulesSchema = {
            description: 'Detecting root and admin users',
            name: 'Query with a rule id',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threat_match',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: '*:*',
            threat_query: 'threat.indicator.domain: *', // narrow things down to indicators with a domain
            threat_index: ['filebeat-*'], // Mimics indicators from the filebeat MISP module
            threat_mapping: [
              {
                entries: [
                  {
                    value: 'threat.indicator.domain',
                    field: 'destination.ip',
                    type: 'mapping',
                  },
                ],
              },
            ],
            threat_filters: [],
          };

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsByIds(supertest, [id]);
          expect(signalsOpen.hits.hits.length).equal(2);

          const { hits } = signalsOpen.hits;
          const threats = hits.map((hit) => hit._source.threat);
          expect(threats).to.eql([
            {
              indicator: [
                {
                  description: "domain should match the auditbeat hosts' data's source.ip",
                  domain: '159.89.119.67',
                  first_seen: '2021-01-26T11:09:04.000Z',
                  matched: {
                    atomic: '159.89.119.67',
                    field: 'destination.ip',
                    type: 'url',
                  },
                  provider: 'geenensp',
                  type: 'url',
                  url: {
                    full: 'http://159.89.119.67:59600/bin.sh',
                    scheme: 'http',
                  },
                },
              ],
            },
            {
              indicator: [
                {
                  description: "domain should match the auditbeat hosts' data's source.ip",
                  domain: '159.89.119.67',
                  first_seen: '2021-01-26T11:09:04.000Z',
                  matched: {
                    atomic: '159.89.119.67',
                    field: 'destination.ip',
                    type: 'url',
                  },
                  provider: 'geenensp',
                  type: 'url',
                  url: {
                    full: 'http://159.89.119.67:59600/bin.sh',
                    scheme: 'http',
                  },
                },
              ],
            },
          ]);
        });

        it('enriches signals with multiple indicators if several matched', async () => {
          const rule: CreateRulesSchema = {
            description: 'Detecting root and admin users',
            name: 'Query with a rule id',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threat_match',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: 'source.port: 57324', // narrow our query to a single record that matches two indicators
            threat_query: 'threat.indicator.ip: *',
            threat_index: ['filebeat-*'], // Mimics indicators from the filebeat MISP module
            threat_mapping: [
              {
                entries: [
                  {
                    value: 'threat.indicator.ip',
                    field: 'source.ip',
                    type: 'mapping',
                  },
                ],
              },
            ],
            threat_filters: [],
          };

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, [id]);
          expect(signalsOpen.hits.hits.length).equal(1);

          const { hits } = signalsOpen.hits;
          const threats = hits.map((hit) => hit._source.threat);
          expect(threats).to.eql([
            {
              indicator: [
                {
                  description: 'this should match auditbeat/hosts on both port and ip',
                  first_seen: '2021-01-26T11:06:03.000Z',
                  ip: '45.115.45.3',
                  matched: {
                    atomic: '45.115.45.3',
                    field: 'source.ip',
                    type: 'url',
                  },
                  port: 57324,
                  provider: 'geenensp',
                  type: 'url',
                },
                {
                  description: 'this should match auditbeat/hosts on ip',
                  first_seen: '2021-01-26T11:06:03.000Z',
                  ip: '45.115.45.3',
                  matched: {
                    atomic: '45.115.45.3',
                    field: 'source.ip',
                    type: 'ip',
                  },
                  provider: 'other_provider',
                  type: 'ip',
                },
              ],
            },
          ]);
        });

        it('adds a single indicator that matched multiple fields', async () => {
          const rule: CreateRulesSchema = {
            description: 'Detecting root and admin users',
            name: 'Query with a rule id',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threat_match',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: 'source.port: 57324', // narrow our query to a single record that matches two indicators
            threat_query: 'threat.indicator.ip: *',
            threat_index: ['filebeat-*'], // Mimics indicators from the filebeat MISP module
            threat_mapping: [
              {
                entries: [
                  {
                    value: 'threat.indicator.port',
                    field: 'source.port',
                    type: 'mapping',
                  },
                ],
              },
              {
                entries: [
                  {
                    value: 'threat.indicator.ip',
                    field: 'source.ip',
                    type: 'mapping',
                  },
                ],
              },
            ],
            threat_filters: [],
          };

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, [id]);
          expect(signalsOpen.hits.hits.length).equal(1);

          const { hits } = signalsOpen.hits;
          const threats = hits.map((hit) => hit._source.threat);
          // TODO how should a signal be enriched if a single indicator matches
          // on multiple fields? As evidenced below, we currently duplicate the
          // indicator with a different matched object.
          expect(threats).to.eql([
            {
              indicator: [
                {
                  description: 'this should match auditbeat/hosts on both port and ip',
                  first_seen: '2021-01-26T11:06:03.000Z',
                  ip: '45.115.45.3',
                  matched: {
                    atomic: '45.115.45.3',
                    field: 'source.ip',
                    type: 'url',
                  },
                  port: 57324,
                  provider: 'geenensp',
                  type: 'url',
                },
                {
                  description: 'this should match auditbeat/hosts on ip',
                  first_seen: '2021-01-26T11:06:03.000Z',
                  ip: '45.115.45.3',
                  matched: {
                    atomic: '45.115.45.3',
                    field: 'source.ip',
                    type: 'ip',
                  },
                  provider: 'other_provider',
                  type: 'ip',
                },
                {
                  description: 'this should match auditbeat/hosts on both port and ip',
                  first_seen: '2021-01-26T11:06:03.000Z',
                  ip: '45.115.45.3',
                  matched: {
                    atomic: 57324,
                    field: 'source.port',
                    type: 'url',
                  },
                  port: 57324,
                  provider: 'geenensp',
                  type: 'url',
                },
              ],
            },
          ]);
        });

        it('generates multiple signals with multiple matches', async () => {
          const rule: CreateRulesSchema = {
            description: 'Detecting root and admin users',
            name: 'Query with a rule id',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threat_match',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: '*:*', // narrow our query to a single record that matches two indicators
            threat_query: '',
            threat_index: ['filebeat-*'], // Mimics indicators from the filebeat MISP module
            threat_mapping: [
              {
                entries: [
                  {
                    value: 'threat.indicator.port',
                    field: 'source.port',
                    type: 'mapping',
                  },
                  {
                    value: 'threat.indicator.ip',
                    field: 'source.ip',
                    type: 'mapping',
                  },
                ],
              },
              {
                entries: [
                  {
                    value: 'threat.indicator.domain',
                    field: 'destination.ip',
                    type: 'mapping',
                  },
                ],
              },
            ],
            threat_filters: [],
          };

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsByIds(supertest, [id]);
          expect(signalsOpen.hits.hits.length).equal(2);

          const { hits } = signalsOpen.hits;
          const threats = hits.map((hit) => hit._source.threat);
          expect(threats).to.eql([
            {
              indicator: [
                {
                  description: "domain should match the auditbeat hosts' data's source.ip",
                  domain: '159.89.119.67',
                  first_seen: '2021-01-26T11:09:04.000Z',
                  matched: {
                    atomic: '159.89.119.67',
                    field: 'destination.ip',
                    type: 'url',
                  },
                  provider: 'geenensp',
                  type: 'url',
                  url: {
                    full: 'http://159.89.119.67:59600/bin.sh',
                    scheme: 'http',
                  },
                },
              ],
            },
            {
              indicator: [
                {
                  description: "domain should match the auditbeat hosts' data's source.ip",
                  domain: '159.89.119.67',
                  first_seen: '2021-01-26T11:09:04.000Z',
                  matched: {
                    atomic: '159.89.119.67',
                    field: 'destination.ip',
                    type: 'url',
                  },
                  provider: 'geenensp',
                  type: 'url',
                  url: {
                    full: 'http://159.89.119.67:59600/bin.sh',
                    scheme: 'http',
                  },
                },
                {
                  description: 'this should match auditbeat/hosts on both port and ip',
                  first_seen: '2021-01-26T11:06:03.000Z',
                  ip: '45.115.45.3',
                  matched: {
                    atomic: '45.115.45.3',
                    field: 'source.ip',
                    type: 'url',
                  },
                  port: 57324,
                  provider: 'geenensp',
                  type: 'url',
                },
                {
                  description: 'this should match auditbeat/hosts on both port and ip',
                  first_seen: '2021-01-26T11:06:03.000Z',
                  ip: '45.115.45.3',
                  matched: {
                    atomic: 57324,
                    field: 'source.port',
                    type: 'url',
                  },
                  port: 57324,
                  provider: 'geenensp',
                  type: 'url',
                },
              ],
            },
          ]);
        });
      });
    });
  });
};

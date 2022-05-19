/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual } from 'lodash';
import expect from '@kbn/expect';
import {
  ALERT_REASON,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_UPDATED_AT,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
  VERSION,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { RuleExecutionStatus } from '@kbn/security-solution-plugin/common/detection_engine/schemas/common';
import { CreateRulesSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';

import { getCreateThreatMatchRulesSchemaMock } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request/rule_schemas.mock';
import { getThreatMatchingSchemaPartialMock } from '@kbn/security-solution-plugin/common/detection_engine/schemas/response/rules_schema.mocks';
import { ENRICHMENT_TYPES } from '@kbn/security-solution-plugin/common/cti/constants';
import { Ancestor } from '@kbn/security-solution-plugin/server/lib/detection_engine/signals/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_EVENT_ACTION,
  ALERT_ORIGINAL_EVENT_CATEGORY,
  ALERT_ORIGINAL_EVENT_MODULE,
  ALERT_ORIGINAL_TIME,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
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
import { FtrProviderContext } from '../../common/ftr_provider_context';

const format = (value: unknown): string => JSON.stringify(value, null, 2);

// Asserts that each expected value is included in the subject, independent of
// ordering. Uses _.isEqual for value comparison.
const assertContains = (subject: unknown[], expected: unknown[]) =>
  expected.forEach((expectedValue) =>
    expect(subject.some((value) => isEqual(value, expectedValue))).to.eql(
      true,
      `expected ${format(subject)} to contain ${format(expectedValue)}`
    )
  );

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * Specific api integration tests for threat matching rule type
   */
  describe('create_threat_matching', () => {
    describe('creating threat match rule', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should create a single rule with a rule_id', async () => {
        const ruleResponse = await createRule(
          supertest,
          log,
          getCreateThreatMatchRulesSchemaMock()
        );
        const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
        expect(bodyToCompare).to.eql(getThreatMatchingSchemaPartialMock());
      });

      it('should create a single rule with a rule_id and validate it ran successfully', async () => {
        const ruleResponse = await createRule(
          supertest,
          log,
          getCreateThreatMatchRulesSchemaMock('rule-1', true)
        );

        await waitForRuleSuccessOrStatus(
          supertest,
          log,
          ruleResponse.id,
          RuleExecutionStatus.succeeded
        );

        const { body: rule } = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .query({ id: ruleResponse.id })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
        expect(bodyToCompare).to.eql(getThreatMatchingSchemaPartialMock(true));

        // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
        expect(rule?.execution_summary?.last_execution.status).to.eql('succeeded');
      });
    });

    describe('tests with auditbeat data', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log);
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
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

        const createdRule = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, createdRule.id);
        await waitForSignalsToBePresent(supertest, log, 10, [createdRule.id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [createdRule.id]);
        expect(signalsOpen.hits.hits.length).equal(10);
        const fullSource = signalsOpen.hits.hits.find(
          (signal) =>
            (signal._source?.[ALERT_ANCESTORS] as Ancestor[])[0].id === '7yJ-B2kBR346wHgnhlMn'
        );
        const fullSignal = fullSource?._source;
        if (!fullSignal) {
          return expect(fullSignal).to.be.ok();
        }
        expect(fullSignal).eql({
          ...fullSignal,
          '@timestamp': fullSignal['@timestamp'],
          agent: {
            ephemeral_id: '1b4978a0-48be-49b1-ac96-323425b389ab',
            hostname: 'zeek-sensor-amsterdam',
            id: 'e52588e6-7aa3-4c89-a2c4-d6bc5c286db1',
            type: 'auditbeat',
            version: '8.0.0',
          },
          auditd: {
            data: {
              hostname: '46.101.47.213',
              op: 'PAM:bad_ident',
              terminal: 'ssh',
            },
            message_type: 'user_err',
            result: 'fail',
            sequence: 2267,
            session: 'unset',
            summary: {
              actor: {
                primary: 'unset',
                secondary: 'root',
              },
              how: '/usr/sbin/sshd',
              object: {
                primary: 'ssh',
                secondary: '46.101.47.213',
                type: 'user-session',
              },
            },
          },
          cloud: {
            instance: {
              id: '133551048',
            },
            provider: 'digitalocean',
            region: 'ams3',
          },
          ecs: {
            version: '1.0.0-beta2',
          },
          ...flattenWithPrefix('event', {
            action: 'error',
            category: 'user-login',
            module: 'auditd',
            kind: 'signal',
          }),
          host: {
            architecture: 'x86_64',
            containerized: false,
            hostname: 'zeek-sensor-amsterdam',
            id: '2ce8b1e7d69e4a1d9c6bcddc473da9d9',
            name: 'zeek-sensor-amsterdam',
            os: {
              codename: 'bionic',
              family: 'debian',
              kernel: '4.15.0-45-generic',
              name: 'Ubuntu',
              platform: 'ubuntu',
              version: '18.04.2 LTS (Bionic Beaver)',
            },
          },
          network: {
            direction: 'incoming',
          },
          process: {
            executable: '/usr/sbin/sshd',
            pid: 32739,
          },
          service: {
            type: 'auditd',
          },
          source: {
            ip: '46.101.47.213',
          },
          user: {
            audit: {
              id: 'unset',
            },
            id: '0',
            name: 'root',
          },
          [ALERT_ANCESTORS]: [
            {
              id: '7yJ-B2kBR346wHgnhlMn',
              type: 'event',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              depth: 0,
            },
          ],
          [ALERT_DEPTH]: 1,
          [ALERT_ORIGINAL_EVENT_ACTION]: 'error',
          [ALERT_ORIGINAL_EVENT_CATEGORY]: 'user-login',
          [ALERT_ORIGINAL_EVENT_MODULE]: 'auditd',
          [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
          [ALERT_REASON]:
            'user-login event by root on zeek-sensor-amsterdam created high alert Query with a rule id.',
          [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
          [ALERT_STATUS]: 'active',
          [ALERT_UUID]: fullSignal[ALERT_UUID],
          [ALERT_WORKFLOW_STATUS]: 'open',
          [SPACE_IDS]: ['default'],
          [VERSION]: fullSignal[VERSION],
          threat: {
            enrichments: get(fullSignal, 'threat.enrichments'),
          },
          ...flattenWithPrefix(ALERT_RULE_NAMESPACE, {
            actions: [],
            author: [],
            category: 'Indicator Match Rule',
            consumer: 'siem',
            created_at: createdRule.created_at,
            created_by: 'elastic',
            description: 'Detecting root and admin users',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: '1900-01-01T00:00:00.000Z',
            immutable: false,
            interval: '5m',
            max_signals: 100,
            name: 'Query with a rule id',
            producer: 'siem',
            references: [],
            risk_score: 55,
            risk_score_mapping: [],
            rule_id: createdRule.rule_id,
            rule_type_id: 'siem.indicatorRule',
            severity: 'high',
            severity_mapping: [],
            tags: [],
            threat: [],
            to: 'now',
            type: 'threat_match',
            updated_at: fullSignal[ALERT_RULE_UPDATED_AT],
            updated_by: 'elastic',
            uuid: createdRule.id,
            version: 1,
          }),
        });
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

        const ruleResponse = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, ruleResponse.id);
        const signalsOpen = await getSignalsByIds(supertest, log, [ruleResponse.id]);
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

        const ruleResponse = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, ruleResponse.id);
        const signalsOpen = await getSignalsByIds(supertest, log, [ruleResponse.id]);
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

        const ruleResponse = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, ruleResponse.id);
        const signalsOpen = await getSignalsByIds(supertest, log, [ruleResponse.id]);
        expect(signalsOpen.hits.hits.length).equal(0);
      });

      describe('timeout behavior', () => {
        // Flaky
        it.skip('will return an error if a rule execution exceeds the rule interval', async () => {
          const rule: CreateRulesSchema = {
            description: 'Detecting root and admin users',
            name: 'Query with a short interval',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threat_match',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: '*:*',
            threat_query: '*:*', // broad query to take more time
            threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
            threat_mapping: [
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
            concurrent_searches: 1,
            interval: '1s', // short interval
            items_per_search: 1, // iterate only 1 threat item per loop to ensure we're slow
          };

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id, RuleExecutionStatus.failed);

          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .query({ id })
            .expect(200);

          // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
          expect(body?.execution_summary?.last_execution.message).to.contain(
            'execution has exceeded its allotted interval'
          );
        });
      });

      describe('indicator enrichment: threat-first search', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/filebeat/threat_intel');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/threat_intel');
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
            query: '*:*', // narrow events down to 2 with a destination.ip
            threat_indicator_path: 'threat.indicator',
            threat_query: 'threat.indicator.domain: 159.89.119.67', // narrow things down to indicators with a domain
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

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(2);

          const { hits } = signalsOpen.hits;
          const threats = hits.map((hit) => hit._source?.threat);
          expect(threats).to.eql([
            {
              enrichments: [
                {
                  feed: {},
                  indicator: {
                    description: "domain should match the auditbeat hosts' data's source.ip",
                    domain: '159.89.119.67',
                    first_seen: '2021-01-26T11:09:04.000Z',
                    provider: 'geenensp',
                    url: {
                      full: 'http://159.89.119.67:59600/bin.sh',
                      scheme: 'http',
                    },
                    type: 'url',
                  },
                  matched: {
                    atomic: '159.89.119.67',
                    id: '978783',
                    index: 'filebeat-8.0.0-2021.01.26-000001',
                    field: 'destination.ip',
                    type: ENRICHMENT_TYPES.IndicatorMatchRule,
                  },
                },
              ],
            },
            {
              enrichments: [
                {
                  feed: {},
                  indicator: {
                    description: "domain should match the auditbeat hosts' data's source.ip",
                    domain: '159.89.119.67',
                    first_seen: '2021-01-26T11:09:04.000Z',
                    provider: 'geenensp',
                    url: {
                      full: 'http://159.89.119.67:59600/bin.sh',
                      scheme: 'http',
                    },
                    type: 'url',
                  },
                  matched: {
                    atomic: '159.89.119.67',
                    id: '978783',
                    index: 'filebeat-8.0.0-2021.01.26-000001',
                    field: 'destination.ip',
                    type: ENRICHMENT_TYPES.IndicatorMatchRule,
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
            query: 'NOT source.port:35326', // specify query to have signals more than treat indicators, but only 1 will match
            threat_indicator_path: 'threat.indicator',
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

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(1);

          const { hits } = signalsOpen.hits;
          const [threat] = hits.map((hit) => hit._source?.threat) as Array<{
            enrichments: unknown[];
          }>;

          assertContains(threat.enrichments, [
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                provider: 'other_provider',
                type: 'ip',
              },

              matched: {
                atomic: '45.115.45.3',
                id: '978787',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
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
            query: 'NOT source.port:35326', // specify query to have signals more than treat indicators, but only 1 will match
            threat_indicator_path: 'threat.indicator',
            threat_query: 'threat.indicator.port: 57324 or threat.indicator.ip:45.115.45.3', // narrow our query to a single indicator
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

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(1);

          const { hits } = signalsOpen.hits;
          const [threat] = hits.map((hit) => hit._source?.threat) as Array<{
            enrichments: unknown[];
          }>;

          assertContains(threat.enrichments, [
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            // We do not merge matched indicators during enrichment, so in
            // certain circumstances a given indicator document could appear
            // multiple times in an enriched alert (albeit with different
            // threat.indicator.matched data). That's the case with the
            // first and third indicators matched, here.
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },

              matched: {
                atomic: 57324,
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.port',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                provider: 'other_provider',
                type: 'ip',
              },
              matched: {
                atomic: '45.115.45.3',
                id: '978787',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
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
            threat_language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: '*:*', // narrow our query to a single record that matches two indicators
            threat_indicator_path: 'threat.indicator',
            threat_query: '*:*',
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

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(2);

          const { hits } = signalsOpen.hits;
          const threats = hits.map((hit) => hit._source?.threat) as Array<{
            enrichments: unknown[];
          }>;

          assertContains(threats[0].enrichments, [
            {
              feed: {},
              indicator: {
                description: "domain should match the auditbeat hosts' data's source.ip",
                domain: '159.89.119.67',
                first_seen: '2021-01-26T11:09:04.000Z',
                provider: 'geenensp',
                type: 'url',
                url: {
                  full: 'http://159.89.119.67:59600/bin.sh',
                  scheme: 'http',
                },
              },
              matched: {
                atomic: '159.89.119.67',
                id: '978783',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'destination.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },
              matched: {
                atomic: 57324,
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.port',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
          ]);

          assertContains(threats[1].enrichments, [
            {
              feed: {},
              indicator: {
                description: "domain should match the auditbeat hosts' data's source.ip",
                domain: '159.89.119.67',
                first_seen: '2021-01-26T11:09:04.000Z',
                provider: 'geenensp',
                type: 'url',
                url: {
                  full: 'http://159.89.119.67:59600/bin.sh',
                  scheme: 'http',
                },
              },
              matched: {
                atomic: '159.89.119.67',
                id: '978783',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'destination.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
          ]);
        });
      });

      describe('indicator enrichment: event-first search', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/filebeat/threat_intel');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/threat_intel');
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
            query: 'destination.ip:159.89.119.67',
            threat_indicator_path: 'threat.indicator',
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

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(2);

          const { hits } = signalsOpen.hits;
          const threats = hits.map((hit) => hit._source?.threat);
          expect(threats).to.eql([
            {
              enrichments: [
                {
                  feed: {},
                  indicator: {
                    description: "domain should match the auditbeat hosts' data's source.ip",
                    domain: '159.89.119.67',
                    first_seen: '2021-01-26T11:09:04.000Z',
                    provider: 'geenensp',
                    url: {
                      full: 'http://159.89.119.67:59600/bin.sh',
                      scheme: 'http',
                    },
                    type: 'url',
                  },
                  matched: {
                    atomic: '159.89.119.67',
                    id: '978783',
                    index: 'filebeat-8.0.0-2021.01.26-000001',
                    field: 'destination.ip',
                    type: ENRICHMENT_TYPES.IndicatorMatchRule,
                  },
                },
              ],
            },
            {
              enrichments: [
                {
                  feed: {},
                  indicator: {
                    description: "domain should match the auditbeat hosts' data's source.ip",
                    domain: '159.89.119.67',
                    first_seen: '2021-01-26T11:09:04.000Z',
                    provider: 'geenensp',
                    url: {
                      full: 'http://159.89.119.67:59600/bin.sh',
                      scheme: 'http',
                    },
                    type: 'url',
                  },
                  matched: {
                    atomic: '159.89.119.67',
                    id: '978783',
                    index: 'filebeat-8.0.0-2021.01.26-000001',
                    field: 'destination.ip',
                    type: ENRICHMENT_TYPES.IndicatorMatchRule,
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
            threat_indicator_path: 'threat.indicator',
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

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(1);

          const { hits } = signalsOpen.hits;
          const [threat] = hits.map((hit) => hit._source?.threat) as Array<{
            enrichments: unknown[];
          }>;

          assertContains(threat.enrichments, [
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                provider: 'other_provider',
                type: 'ip',
              },

              matched: {
                atomic: '45.115.45.3',
                id: '978787',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
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
            threat_indicator_path: 'threat.indicator',
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

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(1);

          const { hits } = signalsOpen.hits;
          const [threat] = hits.map((hit) => hit._source?.threat) as Array<{
            enrichments: unknown[];
          }>;

          assertContains(threat.enrichments, [
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            // We do not merge matched indicators during enrichment, so in
            // certain circumstances a given indicator document could appear
            // multiple times in an enriched alert (albeit with different
            // threat.indicator.matched data). That's the case with the
            // first and third indicators matched, here.
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },

              matched: {
                atomic: 57324,
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.port',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                provider: 'other_provider',
                type: 'ip',
              },
              matched: {
                atomic: '45.115.45.3',
                id: '978787',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
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
            threat_language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: '(source.port:57324 and source.ip:45.115.45.3) or destination.ip:159.89.119.67', // narrow our query to a single record that matches two indicators
            threat_indicator_path: 'threat.indicator',
            threat_query: '*:*',
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

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(2);

          const { hits } = signalsOpen.hits;
          const threats = hits.map((hit) => hit._source?.threat) as Array<{
            enrichments: unknown[];
          }>;

          assertContains(threats[0].enrichments, [
            {
              feed: {},
              indicator: {
                description: "domain should match the auditbeat hosts' data's source.ip",
                domain: '159.89.119.67',
                first_seen: '2021-01-26T11:09:04.000Z',
                provider: 'geenensp',
                type: 'url',
                url: {
                  full: 'http://159.89.119.67:59600/bin.sh',
                  scheme: 'http',
                },
              },
              matched: {
                atomic: '159.89.119.67',
                id: '978783',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'destination.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
            {
              feed: {},
              indicator: {
                description: 'this should match auditbeat/hosts on both port and ip',
                first_seen: '2021-01-26T11:06:03.000Z',
                ip: '45.115.45.3',
                port: 57324,
                provider: 'geenensp',
                type: 'url',
              },
              matched: {
                atomic: 57324,
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.port',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
          ]);

          assertContains(threats[1].enrichments, [
            {
              feed: {},
              indicator: {
                description: "domain should match the auditbeat hosts' data's source.ip",
                domain: '159.89.119.67',
                first_seen: '2021-01-26T11:09:04.000Z',
                provider: 'geenensp',
                type: 'url',
                url: {
                  full: 'http://159.89.119.67:59600/bin.sh',
                  scheme: 'http',
                },
              },
              matched: {
                atomic: '159.89.119.67',
                id: '978783',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'destination.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
            },
          ]);
        });
      });
    });
  });
};

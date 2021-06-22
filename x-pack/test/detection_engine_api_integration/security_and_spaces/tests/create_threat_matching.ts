/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual } from 'lodash';
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
import { SIGNALS_TEMPLATE_VERSION } from '../../../../plugins/security_solution/server/lib/detection_engine/routes/index/get_signals_template';
import { ENRICHMENT_TYPES } from '../../../../plugins/security_solution/common/cti/constants';

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
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
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
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
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
        const fullSource = signalsOpen.hits.hits.find(
          (signal) => signal._source.signal.parents[0].id === 'UBXOBmkBR346wHgnLP8T'
        );
        const fullSignal = fullSource!._source; // If this doesn't exist the test is going to fail anyway so using a bang operator here to get rid of ts error
        expect(fullSignal).eql({
          '@timestamp': fullSignal['@timestamp'],
          agent: {
            ephemeral_id: '1b4978a0-48be-49b1-ac96-323425b389ab',
            hostname: 'zeek-sensor-amsterdam',
            id: 'e52588e6-7aa3-4c89-a2c4-d6bc5c286db1',
            type: 'auditbeat',
            version: '8.0.0',
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
          event: {
            action: 'boot',
            dataset: 'login',
            kind: 'signal',
            module: 'system',
            origin: '/var/log/wtmp',
          },
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
          message: 'System boot',
          service: {
            type: 'system',
          },
          signal: {
            _meta: {
              version: SIGNALS_TEMPLATE_VERSION,
            },
            ancestors: [
              {
                depth: 0,
                id: 'UBXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
            depth: 1,
            original_event: {
              action: 'boot',
              dataset: 'login',
              kind: 'event',
              module: 'system',
              origin: '/var/log/wtmp',
            },
            original_time: fullSignal.signal.original_time,
            owner: 'siem',
            parent: {
              depth: 0,
              id: 'UBXOBmkBR346wHgnLP8T',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              type: 'event',
            },
            parents: [
              {
                depth: 0,
                id: 'UBXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
            rule: fullSignal.signal.rule,
            status: 'open',
          },
          threat: {
            indicator: get(fullSignal, 'threat.indicator'),
          },
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
          await esArchiver.load('x-pack/test/functional/es_archives/filebeat/threat_intel');
        });

        afterEach(async () => {
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
            query: '*:*',
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
                  event: {
                    category: 'threat',
                    created: '2021-01-26T11:09:05.529Z',
                    dataset: 'threatintel.abuseurl',
                    ingested: '2021-01-26T11:09:06.595350Z',
                    kind: 'enrichment',
                    module: 'threatintel',
                    reference: 'https://urlhaus.abuse.ch/url/978783/',
                    type: 'indicator',
                  },
                  first_seen: '2021-01-26T11:09:04.000Z',
                  matched: {
                    atomic: '159.89.119.67',
                    id: '978783',
                    index: 'filebeat-8.0.0-2021.01.26-000001',
                    field: 'destination.ip',
                    type: ENRICHMENT_TYPES.IndicatorMatchRule,
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
                  event: {
                    category: 'threat',
                    created: '2021-01-26T11:09:05.529Z',
                    dataset: 'threatintel.abuseurl',
                    ingested: '2021-01-26T11:09:06.595350Z',
                    kind: 'enrichment',
                    module: 'threatintel',
                    reference: 'https://urlhaus.abuse.ch/url/978783/',
                    type: 'indicator',
                  },
                  first_seen: '2021-01-26T11:09:04.000Z',
                  matched: {
                    atomic: '159.89.119.67',
                    id: '978783',
                    index: 'filebeat-8.0.0-2021.01.26-000001',
                    field: 'destination.ip',
                    type: ENRICHMENT_TYPES.IndicatorMatchRule,
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

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, [id]);
          expect(signalsOpen.hits.hits.length).equal(1);

          const { hits } = signalsOpen.hits;
          const [threat] = hits.map((hit) => hit._source.threat) as Array<{ indicator: unknown[] }>;

          assertContains(threat.indicator, [
            {
              description: 'this should match auditbeat/hosts on both port and ip',
              first_seen: '2021-01-26T11:06:03.000Z',
              ip: '45.115.45.3',
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              port: 57324,
              provider: 'geenensp',
              type: 'url',
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.616763Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978782/',
                type: 'indicator',
              },
            },
            {
              description: 'this should match auditbeat/hosts on ip',
              first_seen: '2021-01-26T11:06:03.000Z',
              ip: '45.115.45.3',
              matched: {
                atomic: '45.115.45.3',
                id: '978787',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              provider: 'other_provider',
              type: 'ip',
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.616763Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978782/',
                type: 'indicator',
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

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, [id]);
          expect(signalsOpen.hits.hits.length).equal(1);

          const { hits } = signalsOpen.hits;
          const [threat] = hits.map((hit) => hit._source.threat) as Array<{ indicator: unknown[] }>;

          assertContains(threat.indicator, [
            {
              description: 'this should match auditbeat/hosts on both port and ip',
              first_seen: '2021-01-26T11:06:03.000Z',
              ip: '45.115.45.3',
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              port: 57324,
              provider: 'geenensp',
              type: 'url',
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.616763Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978782/',
                type: 'indicator',
              },
            },
            // We do not merge matched indicators during enrichment, so in
            // certain circumstances a given indicator document could appear
            // multiple times in an enriched alert (albeit with different
            // threat.indicator.matched data). That's the case with the
            // first and third indicators matched, here.
            {
              description: 'this should match auditbeat/hosts on both port and ip',
              first_seen: '2021-01-26T11:06:03.000Z',
              ip: '45.115.45.3',
              matched: {
                atomic: 57324,
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.port',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              port: 57324,
              provider: 'geenensp',
              type: 'url',
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.616763Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978782/',
                type: 'indicator',
              },
            },
            {
              description: 'this should match auditbeat/hosts on ip',
              first_seen: '2021-01-26T11:06:03.000Z',
              ip: '45.115.45.3',
              matched: {
                atomic: '45.115.45.3',
                id: '978787',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              provider: 'other_provider',
              type: 'ip',
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.616763Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978782/',
                type: 'indicator',
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
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: '*:*', // narrow our query to a single record that matches two indicators
            threat_indicator_path: 'threat.indicator',
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
          const threats = hits.map((hit) => hit._source.threat) as Array<{ indicator: unknown[] }>;

          assertContains(threats[0].indicator, [
            {
              description: "domain should match the auditbeat hosts' data's source.ip",
              domain: '159.89.119.67',
              first_seen: '2021-01-26T11:09:04.000Z',
              matched: {
                atomic: '159.89.119.67',
                id: '978783',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'destination.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              provider: 'geenensp',
              type: 'url',
              url: {
                full: 'http://159.89.119.67:59600/bin.sh',
                scheme: 'http',
              },
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.595350Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978783/',
                type: 'indicator',
              },
            },
          ]);

          assertContains(threats[1].indicator, [
            {
              description: "domain should match the auditbeat hosts' data's source.ip",
              domain: '159.89.119.67',
              first_seen: '2021-01-26T11:09:04.000Z',
              matched: {
                atomic: '159.89.119.67',
                id: '978783',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'destination.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              provider: 'geenensp',
              type: 'url',
              url: {
                full: 'http://159.89.119.67:59600/bin.sh',
                scheme: 'http',
              },
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.595350Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978783/',
                type: 'indicator',
              },
            },
            {
              description: 'this should match auditbeat/hosts on both port and ip',
              first_seen: '2021-01-26T11:06:03.000Z',
              ip: '45.115.45.3',
              matched: {
                atomic: '45.115.45.3',
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.ip',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              port: 57324,
              provider: 'geenensp',
              type: 'url',
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.616763Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978782/',
                type: 'indicator',
              },
            },
            {
              description: 'this should match auditbeat/hosts on both port and ip',
              first_seen: '2021-01-26T11:06:03.000Z',
              ip: '45.115.45.3',
              matched: {
                atomic: 57324,
                id: '978785',
                index: 'filebeat-8.0.0-2021.01.26-000001',
                field: 'source.port',
                type: ENRICHMENT_TYPES.IndicatorMatchRule,
              },
              port: 57324,
              provider: 'geenensp',
              type: 'url',
              event: {
                category: 'threat',
                created: '2021-01-26T11:09:05.529Z',
                dataset: 'threatintel.abuseurl',
                ingested: '2021-01-26T11:09:06.616763Z',
                kind: 'enrichment',
                module: 'threatintel',
                reference: 'https://urlhaus.abuse.ch/url/978782/',
                type: 'indicator',
              },
            },
          ]);
        });
      });
    });
  });
};

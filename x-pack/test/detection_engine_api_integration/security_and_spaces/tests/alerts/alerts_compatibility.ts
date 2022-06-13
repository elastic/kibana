/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL,
} from '../../../../../plugins/security_solution/common/constants';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  finalizeSignalsMigration,
  getEqlRuleForSignalTesting,
  getRuleForSignalTesting,
  getSavedQueryRuleForSignalTesting,
  getSignalsByIds,
  getThreatMatchRuleForSignalTesting,
  getThresholdRuleForSignalTesting,
  startSignalsMigration,
  waitFor,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../../utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ThreatEcs } from '../../../../../plugins/security_solution/common/ecs/threat';
import {
  EqlCreateSchema,
  QueryCreateSchema,
  SavedQueryCreateSchema,
  ThreatMatchCreateSchema,
  ThresholdCreateSchema,
} from '../../../../../plugins/security_solution/common/detection_engine/schemas/request';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const supertest = getService('supertest');

  describe('Alerts Compatibility', function () {
    describe('CTI', () => {
      const expectedDomain = 'elastic.local';
      const expectedProvider = 'provider1';
      const expectedEnrichmentMatch = {
        atomic: expectedDomain,
        field: 'host.name',
        id: '_tdUD3sBcVT20cvWAkpd',
        index: 'filebeat-7.14.0-2021.08.04-000001',
        type: 'indicator_match_rule',
      };

      beforeEach(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/legacy_cti_signals'
        );
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/legacy_cti_signals'
        );
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('allows querying of legacy enriched signals by threat.indicator', async () => {
        const {
          body: {
            hits: { hits },
          },
        }: { body: estypes.SearchResponse<{ threat: ThreatEcs }> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send({
            query: {
              nested: {
                path: 'threat.indicator',
                query: {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'threat.indicator.first_seen',
                        },
                      },
                    ],
                  },
                },
              },
            },
          })
          .expect(200);
        expect(hits.length).to.eql(2);
        const indicators = hits.flatMap((hit) => hit._source?.threat.indicator);
        const indicatorMatches = indicators.map((indicator) => indicator?.matched);
        expect(indicatorMatches).to.eql([expectedEnrichmentMatch, expectedEnrichmentMatch]);
        const indicatorDomains = indicators.map((indicator) => indicator?.domain);
        expect(indicatorDomains).to.eql([expectedDomain, expectedDomain]);
        const indicatorProviders = indicators.map((indicator) => indicator?.provider);
        expect(indicatorProviders).to.eql([expectedProvider, expectedProvider]);
      });

      it('migrates legacy enriched signals to be queried by threat.enrichments', async () => {
        const {
          body: { indices },
        }: {
          body: { indices: Array<{ index: string; is_outdated: boolean; version: number }> };
        } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .query({ from: '2021-08-01' })
          .expect(200);
        expect(indices.length).to.eql(1);
        expect(indices[0].is_outdated).to.eql(true);

        const [migration] = await startSignalsMigration({
          indices: [indices[0].index],
          supertest,
          log,
        });
        await waitFor(
          async () => {
            const [{ completed }] = await finalizeSignalsMigration({
              migrationIds: [migration.migration_id],
              supertest,
              log,
            });
            return completed === true;
          },
          `polling finalize_migration until complete`,
          log
        );

        const {
          body: {
            hits: { hits },
          },
        }: { body: estypes.SearchResponse<{ threat: ThreatEcs }> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send({
            query: {
              nested: {
                path: 'threat.enrichments',
                query: {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'threat.enrichments.indicator.first_seen',
                        },
                      },
                    ],
                  },
                },
              },
            },
          })
          .expect(200);
        expect(hits.length).to.eql(2);
        const enrichments = hits.flatMap((hit) => hit._source?.threat.enrichments);
        const enrichmentMatches = enrichments.map((enrichment) => enrichment?.matched);
        expect(enrichmentMatches).to.eql([expectedEnrichmentMatch, expectedEnrichmentMatch]);
        const enrichmentDomains = enrichments.map(
          (enrichment) => enrichment?.indicator?.url?.domain
        );
        expect(enrichmentDomains).to.eql([expectedDomain, expectedDomain]);
        const enrichmentProviders = enrichments.map(
          (enrichment) => enrichment?.indicator?.provider
        );
        expect(enrichmentProviders).to.eql([expectedProvider, expectedProvider]);
      });

      it('should generate a signal-on-legacy-signal with legacy index pattern', async () => {
        const rule: ThreatMatchCreateSchema = getThreatMatchRuleForSignalTesting([
          '.siem-signals-*',
        ]);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
      });

      it('should generate a signal-on-legacy-signal with AAD index pattern', async () => {
        const rule: ThreatMatchCreateSchema = getThreatMatchRuleForSignalTesting([
          `.alerts-security.alerts-default`,
        ]);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
      });
    });

    describe('Query', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/7.16.0');
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/alerts/7.16.0'
        );
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should generate a signal-on-legacy-signal with legacy index pattern', async () => {
        const rule: QueryCreateSchema = getRuleForSignalTesting([`.siem-signals-*`]);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
        const {
          '@timestamp': timestamp,
          'kibana.version': kibanaVersion,
          'kibana.alert.rule.created_at': createdAt,
          'kibana.alert.rule.updated_at': updatedAt,
          'kibana.alert.rule.execution.uuid': executionUuid,
          'kibana.alert.uuid': alertId,
          ...source
        } = hit._source!;
        expect(source).to.eql({
          'kibana.alert.rule.category': 'Custom Query Rule',
          'kibana.alert.rule.consumer': 'siem',
          'kibana.alert.rule.name': 'Signal Testing Query',
          'kibana.alert.rule.producer': 'siem',
          'kibana.alert.rule.rule_type_id': 'siem.queryRule',
          'kibana.alert.rule.uuid': id,
          'kibana.space_ids': ['default'],
          'kibana.alert.rule.tags': [],
          agent: {
            name: 'security-linux-1.example.dev',
            id: 'd8f66724-3cf2-437c-b124-6ac9fb0e2311',
            type: 'filebeat',
            version: '7.16.0',
          },
          log: {
            file: {
              path: '/opt/Elastic/Agent/data/elastic-agent-a13c93/logs/default/filebeat-20220301-3.ndjson',
            },
            offset: 148938,
          },
          cloud: {
            availability_zone: 'us-central1-c',
            instance: {
              name: 'security-linux-1',
              id: '8995531128842994872',
            },
            provider: 'gcp',
            service: {
              name: 'GCE',
            },
            machine: {
              type: 'g1-small',
            },
            project: {
              id: 'elastic-siem',
            },
            account: {
              id: 'elastic-siem',
            },
          },
          ecs: {
            version: '7.16.0',
          },
          host: {
            hostname: 'security-linux-1',
            os: {
              kernel: '4.19.0-18-cloud-amd64',
              codename: 'buster',
              name: 'Debian GNU/Linux',
              type: 'linux',
              family: 'debian',
              version: '10 (buster)',
              platform: 'debian',
            },
            containerized: false,
            ip: '11.200.0.194',
            name: 'security-linux-1',
            architecture: 'x86_64',
          },
          'service.name': 'filebeat',
          message: 'Status message.',
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'elastic_agent.filebeat',
          },
          'event.agent_id_status': 'verified',
          'event.ingested': '2022-03-23T16:50:28.994Z',
          'event.dataset': 'elastic_agent.filebeat',
          'event.kind': 'signal',
          'kibana.alert.ancestors': [
            {
              id: 'Nmyvt38BIyEvspK02HTJ',
              type: 'event',
              index: 'events-index-000001',
              depth: 0,
            },
            {
              id: '5cddda6852c5f8b6c32d4bfa5e876aa51884e0c7a2d4faaababf91ec9cb68de7',
              type: 'signal',
              index: '.siem-signals-default-000001-7.16.0',
              depth: 1,
              rule: '5b7cd9a0-aac9-11ec-bb53-fd375b7a173a',
            },
          ],
          'kibana.alert.status': 'active',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.depth': 2,
          'kibana.alert.reason':
            'event on security-linux-1 created high alert Signal Testing Query.',
          'kibana.alert.severity': 'high',
          'kibana.alert.risk_score': 1,
          'kibana.alert.rule.parameters': {
            description: 'Tests a simple query',
            risk_score: 1,
            severity: 'high',
            author: [],
            false_positives: [],
            from: '1900-01-01T00:00:00.000Z',
            rule_id: 'rule-1',
            max_signals: 100,
            risk_score_mapping: [],
            severity_mapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptions_list: [],
            immutable: false,
            type: 'query',
            language: 'kuery',
            index: ['.siem-signals-*'],
            query: '*:*',
          },
          'kibana.alert.rule.actions': [],
          'kibana.alert.rule.created_by': 'elastic',
          'kibana.alert.rule.enabled': true,
          'kibana.alert.rule.interval': '5m',
          'kibana.alert.rule.updated_by': 'elastic',
          'kibana.alert.rule.type': 'query',
          'kibana.alert.rule.description': 'Tests a simple query',
          'kibana.alert.rule.risk_score': 1,
          'kibana.alert.rule.severity': 'high',
          'kibana.alert.rule.author': [],
          'kibana.alert.rule.false_positives': [],
          'kibana.alert.rule.from': '1900-01-01T00:00:00.000Z',
          'kibana.alert.rule.rule_id': 'rule-1',
          'kibana.alert.rule.max_signals': 100,
          'kibana.alert.rule.risk_score_mapping': [],
          'kibana.alert.rule.severity_mapping': [],
          'kibana.alert.rule.threat': [],
          'kibana.alert.rule.to': 'now',
          'kibana.alert.rule.references': [],
          'kibana.alert.rule.version': 1,
          'kibana.alert.rule.exceptions_list': [],
          'kibana.alert.rule.immutable': false,
          'kibana.alert.original_time': '2022-03-23T16:50:40.440Z',
          'kibana.alert.original_event.agent_id_status': 'verified',
          'kibana.alert.original_event.ingested': '2022-03-23T16:50:28.994Z',
          'kibana.alert.original_event.dataset': 'elastic_agent.filebeat',
          'kibana.alert.original_event.kind': 'signal',
        });
      });

      it('should generate a signal-on-legacy-signal with AAD index pattern', async () => {
        const rule: QueryCreateSchema = getRuleForSignalTesting([
          `.alerts-security.alerts-default`,
        ]);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
        const {
          '@timestamp': timestamp,
          'kibana.version': kibanaVersion,
          'kibana.alert.rule.created_at': createdAt,
          'kibana.alert.rule.updated_at': updatedAt,
          'kibana.alert.rule.execution.uuid': executionUuid,
          'kibana.alert.uuid': alertId,
          ...source
        } = hit._source!;
        expect(source).to.eql({
          'kibana.alert.rule.category': 'Custom Query Rule',
          'kibana.alert.rule.consumer': 'siem',
          'kibana.alert.rule.name': 'Signal Testing Query',
          'kibana.alert.rule.producer': 'siem',
          'kibana.alert.rule.rule_type_id': 'siem.queryRule',
          'kibana.alert.rule.uuid': id,
          'kibana.space_ids': ['default'],
          'kibana.alert.rule.tags': [],
          agent: {
            name: 'security-linux-1.example.dev',
            id: 'd8f66724-3cf2-437c-b124-6ac9fb0e2311',
            type: 'filebeat',
            version: '7.16.0',
          },
          log: {
            file: {
              path: '/opt/Elastic/Agent/data/elastic-agent-a13c93/logs/default/filebeat-20220301-3.ndjson',
            },
            offset: 148938,
          },
          cloud: {
            availability_zone: 'us-central1-c',
            instance: {
              name: 'security-linux-1',
              id: '8995531128842994872',
            },
            provider: 'gcp',
            service: {
              name: 'GCE',
            },
            machine: {
              type: 'g1-small',
            },
            project: {
              id: 'elastic-siem',
            },
            account: {
              id: 'elastic-siem',
            },
          },
          ecs: {
            version: '7.16.0',
          },
          host: {
            hostname: 'security-linux-1',
            os: {
              kernel: '4.19.0-18-cloud-amd64',
              codename: 'buster',
              name: 'Debian GNU/Linux',
              type: 'linux',
              family: 'debian',
              version: '10 (buster)',
              platform: 'debian',
            },
            containerized: false,
            ip: '11.200.0.194',
            name: 'security-linux-1',
            architecture: 'x86_64',
          },
          'service.name': 'filebeat',
          message: 'Status message.',
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'elastic_agent.filebeat',
          },
          'event.agent_id_status': 'verified',
          'event.ingested': '2022-03-23T16:50:28.994Z',
          'event.dataset': 'elastic_agent.filebeat',
          'event.kind': 'signal',
          'kibana.alert.ancestors': [
            {
              id: 'Nmyvt38BIyEvspK02HTJ',
              type: 'event',
              index: 'events-index-000001',
              depth: 0,
            },
            {
              id: '5cddda6852c5f8b6c32d4bfa5e876aa51884e0c7a2d4faaababf91ec9cb68de7',
              type: 'signal',
              index: '.siem-signals-default-000001-7.16.0',
              depth: 1,
              rule: '5b7cd9a0-aac9-11ec-bb53-fd375b7a173a',
            },
          ],
          'kibana.alert.status': 'active',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.depth': 2,
          'kibana.alert.reason':
            'event on security-linux-1 created high alert Signal Testing Query.',
          'kibana.alert.severity': 'high',
          'kibana.alert.risk_score': 1,
          'kibana.alert.rule.parameters': {
            description: 'Tests a simple query',
            risk_score: 1,
            severity: 'high',
            author: [],
            false_positives: [],
            from: '1900-01-01T00:00:00.000Z',
            rule_id: 'rule-1',
            max_signals: 100,
            risk_score_mapping: [],
            severity_mapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptions_list: [],
            immutable: false,
            type: 'query',
            language: 'kuery',
            index: ['.alerts-security.alerts-default'],
            query: '*:*',
          },
          'kibana.alert.rule.actions': [],
          'kibana.alert.rule.created_by': 'elastic',
          'kibana.alert.rule.enabled': true,
          'kibana.alert.rule.interval': '5m',
          'kibana.alert.rule.updated_by': 'elastic',
          'kibana.alert.rule.type': 'query',
          'kibana.alert.rule.description': 'Tests a simple query',
          'kibana.alert.rule.risk_score': 1,
          'kibana.alert.rule.severity': 'high',
          'kibana.alert.rule.author': [],
          'kibana.alert.rule.false_positives': [],
          'kibana.alert.rule.from': '1900-01-01T00:00:00.000Z',
          'kibana.alert.rule.rule_id': 'rule-1',
          'kibana.alert.rule.max_signals': 100,
          'kibana.alert.rule.risk_score_mapping': [],
          'kibana.alert.rule.severity_mapping': [],
          'kibana.alert.rule.threat': [],
          'kibana.alert.rule.to': 'now',
          'kibana.alert.rule.references': [],
          'kibana.alert.rule.version': 1,
          'kibana.alert.rule.exceptions_list': [],
          'kibana.alert.rule.immutable': false,
          'kibana.alert.original_time': '2022-03-23T16:50:40.440Z',
          'kibana.alert.original_event.agent_id_status': 'verified',
          'kibana.alert.original_event.ingested': '2022-03-23T16:50:28.994Z',
          'kibana.alert.original_event.dataset': 'elastic_agent.filebeat',
          'kibana.alert.original_event.kind': 'signal',
        });
      });
    });

    describe('Saved Query', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/7.16.0');
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/alerts/7.16.0'
        );
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should generate a signal-on-legacy-signal with legacy index pattern', async () => {
        const rule: SavedQueryCreateSchema = getSavedQueryRuleForSignalTesting([`.siem-signals-*`]);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
      });

      it('should generate a signal-on-legacy-signal with AAD index pattern', async () => {
        const rule: SavedQueryCreateSchema = getSavedQueryRuleForSignalTesting([
          `.alerts-security.alerts-default`,
        ]);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
      });
    });

    describe('EQL', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/7.16.0');
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/alerts/7.16.0'
        );
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should generate a signal-on-legacy-signal with legacy index pattern', async () => {
        const rule: EqlCreateSchema = getEqlRuleForSignalTesting(['.siem-signals-*']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
      });

      it('should generate a signal-on-legacy-signal with AAD index pattern', async () => {
        const rule: EqlCreateSchema = getEqlRuleForSignalTesting([
          `.alerts-security.alerts-default`,
        ]);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
      });
    });

    describe('Threshold', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/7.16.0');
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/alerts/7.16.0'
        );
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should generate a signal-on-legacy-signal with legacy index pattern', async () => {
        const baseRule: ThresholdCreateSchema = getThresholdRuleForSignalTesting([
          '.siem-signals-*',
        ]);
        const rule: ThresholdCreateSchema = {
          ...baseRule,
          threshold: {
            ...baseRule.threshold,
            field: 'host.name',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
      });

      it('should generate a signal-on-legacy-signal with AAD index pattern', async () => {
        const baseRule: ThresholdCreateSchema = getThresholdRuleForSignalTesting([
          `.alerts-security.alerts-default`,
        ]);
        const rule: ThresholdCreateSchema = {
          ...baseRule,
          threshold: {
            ...baseRule.threshold,
            field: 'host.name',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
        const hit = signalsOpen.hits.hits[0];
        expect(hit._source?.kibana).to.eql(undefined);
      });
    });
  });
};

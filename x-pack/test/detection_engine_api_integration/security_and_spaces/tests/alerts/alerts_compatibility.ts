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
            ephemeral_id: '07c24b1e-3663-4372-b982-f2d831e033eb',
            hostname: 'elastic.local',
            id: 'ce7741d9-3f0a-466d-8ae6-d7d8f883fcec',
            name: 'elastic.local',
            type: 'auditbeat',
            version: '7.14.0',
          },
          ecs: { version: '1.10.0' },
          host: {
            architecture: 'x86_64',
            hostname: 'elastic.local',
            id: '1633D595-A115-5BF5-870B-A471B49446C3',
            ip: ['192.168.1.1'],
            mac: ['aa:bb:cc:dd:ee:ff'],
            name: 'elastic.local',
            os: {
              build: '20G80',
              family: 'darwin',
              kernel: '20.6.0',
              name: 'Mac OS X',
              platform: 'darwin',
              type: 'macos',
              version: '10.16',
            },
          },
          message: 'Process mdworker_shared (PID: 32306) by user elastic STARTED',
          process: {
            args: [
              '/System/Library/Frameworks/CoreServices.framework/Frameworks/Metadata.framework/Versions/A/Support/mdworker_shared',
              '-s',
              'mdworker',
              '-c',
              'MDSImporterWorker',
              '-m',
              'com.apple.mdworker.shared',
            ],
            entity_id: 'wfc7zUuEinqxUbZ6',
            executable:
              '/System/Library/Frameworks/CoreServices.framework/Frameworks/Metadata.framework/Versions/A/Support/mdworker_shared',
            hash: { sha1: '5f3233fd75c14b315731684d59b632df36a731a6' },
            name: 'mdworker_shared',
            pid: 32306,
            ppid: 1,
            start: '2021-08-04T04:14:48.830Z',
            working_directory: '/',
          },
          service: { type: 'system' },
          threat: {
            indicator: [
              {
                domain: 'elastic.local',
                event: {
                  category: 'threat',
                  created: '2021-08-04T03:53:30.761Z',
                  dataset: 'ti_abusech.malware',
                  ingested: '2021-08-04T03:53:37.514040Z',
                  kind: 'enrichment',
                  module: 'threatintel',
                  reference: 'https://urlhaus.abuse.ch/url/12345/',
                  type: 'indicator',
                },
                first_seen: '2021-08-03T20:35:17.000Z',
                matched: {
                  atomic: 'elastic.local',
                  field: 'host.name',
                  id: '_tdUD3sBcVT20cvWAkpd',
                  index: 'filebeat-7.14.0-2021.08.04-000001',
                  type: 'indicator_match_rule',
                },
                provider: 'provider1',
                type: 'url',
                url: {
                  domain: 'elastic.local',
                  extension: 'php',
                  full: 'http://elastic.local/thing',
                  original: 'http://elastic.local/thing',
                  path: '/thing',
                  scheme: 'http',
                },
              },
            ],
          },
          user: {
            effective: { group: { id: '20' }, id: '501' },
            group: { id: '20', name: 'staff' },
            id: '501',
            name: 'elastic',
            saved: { group: { id: '20' }, id: '501' },
          },
          'event.action': 'process_started',
          'event.category': ['process'],
          'event.dataset': 'process',
          'event.kind': 'signal',
          'event.module': 'system',
          'event.type': ['start'],
          'kibana.alert.ancestors': [
            {
              depth: 0,
              id: 'yNdfD3sBcVT20cvWFEs2',
              index: 'auditbeat-7.14.0-2021.08.04-000001',
              type: 'event',
            },
            {
              id: '0527411874b23bcea85daf5bf7dcacd144536ba6d92d3230a4a0acfb7de7f512',
              type: 'signal',
              index: '.siem-signals-default-000001',
              depth: 1,
              rule: '832f86f0-f4da-11eb-989d-b758d09dbc85',
            },
          ],
          'kibana.alert.status': 'active',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.depth': 2,
          'kibana.alert.reason':
            'process event with process mdworker_shared, by elastic on elastic.local created high alert Signal Testing Query.',
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
          'kibana.alert.original_time': '2021-08-04T04:14:58.973Z',
          'kibana.alert.original_event.action': 'process_started',
          'kibana.alert.original_event.category': ['process'],
          'kibana.alert.original_event.dataset': 'process',
          'kibana.alert.original_event.kind': 'signal',
          'kibana.alert.original_event.module': 'system',
          'kibana.alert.original_event.type': ['start'],
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
            ephemeral_id: '07c24b1e-3663-4372-b982-f2d831e033eb',
            hostname: 'elastic.local',
            id: 'ce7741d9-3f0a-466d-8ae6-d7d8f883fcec',
            name: 'elastic.local',
            type: 'auditbeat',
            version: '7.14.0',
          },
          ecs: { version: '1.10.0' },
          host: {
            architecture: 'x86_64',
            hostname: 'elastic.local',
            id: '1633D595-A115-5BF5-870B-A471B49446C3',
            ip: ['192.168.1.1'],
            mac: ['aa:bb:cc:dd:ee:ff'],
            name: 'elastic.local',
            os: {
              build: '20G80',
              family: 'darwin',
              kernel: '20.6.0',
              name: 'Mac OS X',
              platform: 'darwin',
              type: 'macos',
              version: '10.16',
            },
          },
          message: 'Process mdworker_shared (PID: 32306) by user elastic STARTED',
          process: {
            args: [
              '/System/Library/Frameworks/CoreServices.framework/Frameworks/Metadata.framework/Versions/A/Support/mdworker_shared',
              '-s',
              'mdworker',
              '-c',
              'MDSImporterWorker',
              '-m',
              'com.apple.mdworker.shared',
            ],
            entity_id: 'wfc7zUuEinqxUbZ6',
            executable:
              '/System/Library/Frameworks/CoreServices.framework/Frameworks/Metadata.framework/Versions/A/Support/mdworker_shared',
            hash: { sha1: '5f3233fd75c14b315731684d59b632df36a731a6' },
            name: 'mdworker_shared',
            pid: 32306,
            ppid: 1,
            start: '2021-08-04T04:14:48.830Z',
            working_directory: '/',
          },
          service: { type: 'system' },
          threat: {
            indicator: [
              {
                domain: 'elastic.local',
                event: {
                  category: 'threat',
                  created: '2021-08-04T03:53:30.761Z',
                  dataset: 'ti_abusech.malware',
                  ingested: '2021-08-04T03:53:37.514040Z',
                  kind: 'enrichment',
                  module: 'threatintel',
                  reference: 'https://urlhaus.abuse.ch/url/12345/',
                  type: 'indicator',
                },
                first_seen: '2021-08-03T20:35:17.000Z',
                matched: {
                  atomic: 'elastic.local',
                  field: 'host.name',
                  id: '_tdUD3sBcVT20cvWAkpd',
                  index: 'filebeat-7.14.0-2021.08.04-000001',
                  type: 'indicator_match_rule',
                },
                provider: 'provider1',
                type: 'url',
                url: {
                  domain: 'elastic.local',
                  extension: 'php',
                  full: 'http://elastic.local/thing',
                  original: 'http://elastic.local/thing',
                  path: '/thing',
                  scheme: 'http',
                },
              },
            ],
          },
          user: {
            effective: { group: { id: '20' }, id: '501' },
            group: { id: '20', name: 'staff' },
            id: '501',
            name: 'elastic',
            saved: { group: { id: '20' }, id: '501' },
          },
          'event.action': 'process_started',
          'event.category': ['process'],
          'event.dataset': 'process',
          'event.kind': 'signal',
          'event.module': 'system',
          'event.type': ['start'],
          'kibana.alert.ancestors': [
            {
              depth: 0,
              id: 'yNdfD3sBcVT20cvWFEs2',
              index: 'auditbeat-7.14.0-2021.08.04-000001',
              type: 'event',
            },
            {
              id: '0527411874b23bcea85daf5bf7dcacd144536ba6d92d3230a4a0acfb7de7f512',
              type: 'signal',
              index: '.siem-signals-default-000001',
              depth: 1,
              rule: '832f86f0-f4da-11eb-989d-b758d09dbc85',
            },
          ],
          'kibana.alert.status': 'active',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.depth': 2,
          'kibana.alert.reason':
            'process event with process mdworker_shared, by elastic on elastic.local created high alert Signal Testing Query.',
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
          'kibana.alert.original_time': '2021-08-04T04:14:58.973Z',
          'kibana.alert.original_event.action': 'process_started',
          'kibana.alert.original_event.category': ['process'],
          'kibana.alert.original_event.dataset': 'process',
          'kibana.alert.original_event.kind': 'signal',
          'kibana.alert.original_event.module': 'system',
          'kibana.alert.original_event.type': ['start'],
        });
      });
    });

    describe('Saved Query', () => {
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
      it('should generate a signal-on-legacy-signal with legacy index pattern', async () => {
        const baseRule: ThresholdCreateSchema = getThresholdRuleForSignalTesting([
          '.siem-signals-*',
        ]);
        const rule: ThresholdCreateSchema = {
          ...baseRule,
          threshold: {
            ...baseRule.threshold,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import type { CreateExceptionListItemSchema, Type } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_URL } from '@kbn/securitysolution-list-constants';
import type {
  RuleCreateProps,
  EqlRuleCreateProps,
  QueryRuleCreateProps,
  ThreatMatchRuleCreateProps,
  ThresholdRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import {
  createAlertsIndex,
  createRule,
  deleteAllRules,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
  getAlertsByIds,
  deleteAllAlerts,
} from '@kbn/detections-response-ftr-services';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';
import {
  getSimpleRule,
  createExceptionList,
  createExceptionListItem,
  getThresholdRuleForAlertTesting,
  getOpenAlerts,
  createRuleWithExceptionEntries,
  getEqlRuleForAlertTesting,
} from '../../../../utils';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
  waitForListSize,
} from '../../../../../lists_and_exception_lists/utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

const SYNTHETIC_INDEX = 'value-list-matrix-test';
const SYNTHETIC_HOST = 'value-list-matrix-host';
// WKT point in geo (lon, lat) order used for both geo_shape and shape tests.
const GEO_WKT = 'POINT (-74.006 40.7128)';
// Cartesian WKT point for the ES `shape` (non-geographic) type.
const CARTESIAN_WKT = 'POINT (100.0 200.0)';
// Geo coordinates stored as "lat,lon" (the lists plugin serialization format).
const GEO_LAT_LON = '40.7128,-74.006';

interface AuditbeatValueListSample {
  hostName: string;
  sourceIp: string;
  sourcePort: number;
  timestampIso: string;
  containerized: string;
  riskScore?: number;
}

const ipToSlash16 = (ip: string): string => {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.0.0/16`;
  }
  return `${ip}/128`;
};

const toDateNanosLine = (iso: string): string => {
  const match = iso.match(/^(.+T\d{2}:\d{2}:\d{2})(\.\d+)?Z$/);
  if (match == null) {
    return `${iso.replace(/Z$/, '')}.000000000Z`;
  }
  const base = match[1];
  const fractionalDigits = (match[2] ?? '.0').slice(1);
  const padded = `${fractionalDigits}000000000`.slice(0, 9);
  return `${base}.${padded}Z`;
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@serverless @serverlessQA @ess rule exceptions execution', () => {
    before(async () => {
      await esArchiver.load(path);
    });

    after(async () => {
      await esArchiver.unload(path);
    });

    describe('creating rules with exceptions', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await deleteAllExceptions(supertest, log);
      });

      it('should be able to execute against an exception list that does not include valid entries and get back 10 alerts', async () => {
        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          log,
          getCreateExceptionListMinimalSchemaMock()
        );

        const exceptionListItem: CreateExceptionListItemSchema = {
          ...getCreateExceptionListItemMinimalSchemaMock(),
          entries: [
            {
              field: 'some.none.existent.field', // non-existent field where we should not exclude anything
              operator: 'included',
              type: 'match',
              value: 'some value',
            },
          ],
        };
        await createExceptionListItem(supertest, log, exceptionListItem);

        const ruleWithException: RuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'query',
          from: '1900-01-01T00:00:00.000Z',
          query: 'host.name: "suricata-sensor-amsterdam"',
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        };
        const { id: createdId } = await createRule(supertest, log, ruleWithException);
        await waitForRuleSuccess({ supertest, log, id: createdId });
        await waitForAlertsToBePresent(supertest, log, 10, [createdId]);
        const alertsOpen = await getAlertsByIds(supertest, log, [createdId]);
        expect(alertsOpen.hits.hits).toHaveLength(10);
      });

      it('should be able to execute against an exception list that does include valid entries and get back 0 alerts', async () => {
        const rule: QueryRuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'query',
          from: '1900-01-01T00:00:00.000Z',
          query: 'host.name: "suricata-sensor-amsterdam"',
        };
        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'host.name', // This matches the query above which will exclude everything
              operator: 'included',
              type: 'match',
              value: 'suricata-sensor-amsterdam',
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        expect(alertsOpen.hits.hits).toHaveLength(0);
      });

      it('should be able to execute against an exception list that does include valid case sensitive entries and get back 0 alerts', async () => {
        const rule: QueryRuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'query',
          from: '1900-01-01T00:00:00.000Z',
          query: 'host.name: "suricata-sensor-amsterdam"',
        };
        const rule2: QueryRuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-2',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'query',
          from: '1900-01-01T00:00:00.000Z',
          query: 'host.name: "suricata-sensor-amsterdam"',
        };
        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'host.os.name',
              operator: 'included',
              type: 'match_any',
              value: ['ubuntu'],
            },
          ],
        ]);
        const createdRule2 = await createRuleWithExceptionEntries(supertest, log, rule2, [
          [
            {
              field: 'host.os.name', // This matches the query above which will exclude everything
              operator: 'included',
              type: 'match_any',
              value: ['ubuntu', 'Ubuntu'],
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        const alertsOpen2 = await getOpenAlerts(supertest, log, es, createdRule2);
        // Expect alerts here because all values are "Ubuntu"
        // and exception is one of ["ubuntu"]
        expect(alertsOpen.hits.hits).toHaveLength(10);
        // Expect no alerts here because all values are "Ubuntu"
        // and exception is one of ["ubuntu", "Ubuntu"]
        expect(alertsOpen2.hits.hits).toHaveLength(0);
      });

      it('generates no alerts when an exception is added for an EQL rule', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['auditbeat-*']),
          query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
        };
        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'host.id',
              operator: 'included',
              type: 'match',
              value: '8cc95778cce5407c809480e8e32ad76b',
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        expect(alertsOpen.hits.hits).toHaveLength(0);
      });

      it('generates no alerts when an exception is added for a threshold rule', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForAlertTesting(['auditbeat-*']),
          threshold: {
            field: 'host.id',
            value: 700,
          },
        };
        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'host.id',
              operator: 'included',
              type: 'match',
              value: '8cc95778cce5407c809480e8e32ad76b',
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        expect(alertsOpen.hits.hits).toHaveLength(0);
      });

      it('generates no alerts when an exception is added for a threat match rule', async () => {
        const rule: ThreatMatchRuleCreateProps = {
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

        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'source.ip',
              operator: 'included',
              type: 'match',
              value: '188.166.120.93',
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        expect(alertsOpen.hits.hits).toHaveLength(0);
      });

      describe('rules with value list exceptions', () => {
        beforeEach(async () => {
          await createListsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteListsIndex(supertest, log);
        });

        it('generates no alerts when a value list exception is added for a query rule', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['suricata-sensor-amsterdam'], valueListId);
          const rule: QueryRuleCreateProps = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'query',
            from: '1900-01-01T00:00:00.000Z',
            query: 'host.name: "suricata-sensor-amsterdam"',
          };
          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
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
          const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alertsOpen.hits.hits).toHaveLength(0);
        });

        it('generates no alerts when a value list exception is added for a threat match rule', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
          const rule: ThreatMatchRuleCreateProps = {
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

          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
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
          const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alertsOpen.hits.hits).toHaveLength(0);
        });

        it('generates no alerts when a value list exception is added for a threshold rule', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
          const rule: ThresholdRuleCreateProps = {
            description: 'Detecting root and admin users',
            name: 'Query with a rule id',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threshold',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: 'host.name: "zeek-sensor-amsterdam"',
            threshold: {
              field: 'host.name',
              value: 1,
            },
          };

          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
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
          const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alertsOpen.hits.hits).toHaveLength(0);
        });

        it('generates no alerts when a value list exception is added for an EQL rule', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['auditbeat-*']),
            query: 'configuration where host.name=="zeek-sensor-amsterdam"',
          };

          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
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
          const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alertsOpen.hits.hits).toHaveLength(0);
        });

        describe('query rule: value list exception filters documents for Elasticsearch list types', function () {
          this.timeout(120000);

          let sample: AuditbeatValueListSample;

          before(async () => {
            // `source.port` must fit into an Elasticsearch `short` (signed
            // 16-bit: -32768..32767). Many auditbeat ephemeral ports exceed
            // this range, which would cause `short`-typed list item imports to
            // be rejected and the `short` test to time out waiting for the
            // list item to appear. Constrain the sample selection up front.
            const SHORT_MAX = 32767;
            const res = await es.search({
              index: ['auditbeat-*'],
              size: 50,
              query: {
                bool: {
                  filter: [
                    { exists: { field: 'host.name' } },
                    { exists: { field: 'source.ip' } },
                    { exists: { field: 'source.port' } },
                    { exists: { field: 'destination.port' } },
                    { exists: { field: '@timestamp' } },
                    { exists: { field: 'host.containerized' } },
                    { range: { 'source.port': { lte: SHORT_MAX } } },
                  ],
                },
              },
              _source: [
                'host.name',
                'source.ip',
                'source.port',
                'destination.port',
                '@timestamp',
                'host.containerized',
              ],
            });
            const hit = res.hits.hits.find((h) => {
              const loc = (h._source as { host?: { containerized?: { location?: unknown } } })?.host
                ?.containerized;
              return loc != null;
            });
            if (hit == null || hit._source == null) {
              throw new Error(
                'Expected an auditbeat-* document with host, source, timestamp, risk_score, and geo for value list matrix tests'
              );
            }
            const src = hit._source as Record<string, unknown>;
            const tsRaw = src['@timestamp'];
            const timestampIso =
              typeof tsRaw === 'string'
                ? tsRaw
                : typeof tsRaw === 'number'
                ? new Date(tsRaw).toISOString()
                : new Date(String(tsRaw)).toISOString();

            sample = {
              hostName: String((src as { host?: { name?: string } }).host?.name),
              sourceIp: String((src as { source?: { ip?: string } }).source?.ip),
              sourcePort: Number((src as { source?: { port?: number } }).source?.port),
              timestampIso,
              containerized: String(
                (src as { host?: { containerized?: boolean } }).host?.containerized
              ),
              riskScore:
                typeof (src as { event?: { risk_score?: number } }).event?.risk_score === 'number'
                  ? (src as { event: { risk_score: number } }).event.risk_score
                  : undefined,
            };

            // Create a synthetic index with controlled mappings for types that
            // require fields not reliably present in the auditbeat fixture.
            await es.indices.create({
              index: SYNTHETIC_INDEX,
              mappings: {
                properties: {
                  host: { properties: { name: { type: 'keyword' } } },
                  '@timestamp': { type: 'date' },
                  source: { properties: { port: { type: 'integer' } } },
                  geo_location: { type: 'geo_point' },
                  geo_shape_field: { type: 'geo_shape' },
                  shape_field: { type: 'shape' },
                },
              },
            });
            await es.index({
              index: SYNTHETIC_INDEX,
              document: {
                host: { name: SYNTHETIC_HOST },
                '@timestamp': '2020-01-01T00:00:00.000Z',
                source: { port: 100 },
                geo_location: GEO_LAT_LON,
                geo_shape_field: GEO_WKT,
                shape_field: CARTESIAN_WKT,
              },
              refresh: 'wait_for',
            });
          });

          after(async () => {
            await es.indices.delete({ index: SYNTHETIC_INDEX });
          });

          const runValueListFilterCase = async ({
            listType,
            field,
            listLines,
            ruleQuery,
            testValues,
            index = ['auditbeat-*'],
          }: {
            listType: Type;
            field: string;
            listLines: string[];
            ruleQuery: string;
            testValues?: string[];
            index?: string[];
          }) => {
            const valueListId = `vl-${listType}-${uuidv4()}.txt`;
            await importFile(supertest, log, listType, listLines, valueListId, testValues);
            const rule: QueryRuleCreateProps = {
              name: `Value list matrix ${listType}`,
              description: 'Value list exception matrix',
              enabled: true,
              risk_score: 1,
              rule_id: `rule-vl-${listType}-${uuidv4()}`,
              severity: 'high',
              index,
              type: 'query',
              from: '1900-01-01T00:00:00.000Z',
              query: ruleQuery,
            };
            const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field,
                  operator: 'included',
                  type: 'list',
                  list: {
                    id: valueListId,
                    type: listType,
                  },
                },
              ],
            ]);
            const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
            expect(alertsOpen.hits.hits).toHaveLength(0);
          };

          it('keyword', async () => {
            await runValueListFilterCase({
              listType: 'keyword',
              field: 'host.name',
              listLines: [sample.hostName],
              ruleQuery: `host.name: "${sample.hostName}"`,
            });
          });

          it('text', async () => {
            await runValueListFilterCase({
              listType: 'text',
              field: 'host.name',
              listLines: [sample.hostName],
              ruleQuery: `host.name: "${sample.hostName}"`,
            });
          });

          it('ip', async () => {
            await runValueListFilterCase({
              listType: 'ip',
              field: 'source.ip',
              listLines: [sample.sourceIp],
              ruleQuery: `source.ip: "${sample.sourceIp}"`,
            });
          });

          it('ip_range', async () => {
            await runValueListFilterCase({
              listType: 'ip_range',
              field: 'source.ip',
              listLines: [ipToSlash16(sample.sourceIp)],
              ruleQuery: `source.ip: "${sample.sourceIp}"`,
              testValues: [sample.sourceIp],
            });
          });

          it('boolean', async () => {
            await runValueListFilterCase({
              listType: 'boolean',
              field: 'host.containerized',
              listLines: [sample.containerized],
              ruleQuery: `host.containerized: ${sample.containerized}`,
            });
          });

          it('short', async () => {
            await runValueListFilterCase({
              listType: 'short',
              field: 'source.port',
              listLines: [sample.sourcePort.toString()],
              ruleQuery: `source.port: ${sample.sourcePort}`,
            });
          });

          it('integer', async () => {
            await runValueListFilterCase({
              listType: 'integer',
              field: 'source.port',
              listLines: [String(sample.sourcePort)],
              ruleQuery: `source.port: ${sample.sourcePort}`,
            });
          });

          it('long', async () => {
            await runValueListFilterCase({
              listType: 'long',
              field: 'source.port',
              listLines: [String(sample.sourcePort)],
              ruleQuery: `source.port: ${sample.sourcePort}`,
            });
          });

          it('date', async () => {
            await runValueListFilterCase({
              listType: 'date',
              field: '@timestamp',
              listLines: [sample.timestampIso],
              ruleQuery: `@timestamp: "${sample.timestampIso}"`,
            });
          });

          it('date_nanos', async () => {
            await runValueListFilterCase({
              listType: 'date_nanos',
              field: '@timestamp',
              listLines: [toDateNanosLine(sample.timestampIso)],
              ruleQuery: `@timestamp: "${sample.timestampIso}"`,
            });
          });

          it('float', async () => {
            await runValueListFilterCase({
              listType: 'float',
              field: 'source.port',
              listLines: [String(sample.sourcePort)],
              ruleQuery: `source.port: ${sample.sourcePort}`,
            });
          });

          it('half_float', async () => {
            await runValueListFilterCase({
              listType: 'half_float',
              field: 'source.port',
              listLines: [String(sample.sourcePort)],
              ruleQuery: `source.port: ${sample.sourcePort}`,
            });
          });

          it('double', async () => {
            await runValueListFilterCase({
              listType: 'double',
              field: 'source.port',
              listLines: [String(sample.sourcePort)],
              ruleQuery: `source.port: ${sample.sourcePort}`,
            });
          });

          // The following tests use the synthetic index (SYNTHETIC_INDEX) rather
          // than auditbeat-* because they require fields or data ranges not
          // reliably present in the auditbeat fixture.

          it('byte', async () => {
            // source.port: 100 is within the signed byte range (-128..127).
            await runValueListFilterCase({
              listType: 'byte',
              field: 'source.port',
              listLines: ['100'],
              ruleQuery: `source.port: 100`,
              index: [SYNTHETIC_INDEX],
            });
          });

          it('geo_point', async () => {
            await runValueListFilterCase({
              listType: 'geo_point',
              field: 'geo_location',
              listLines: [GEO_LAT_LON],
              ruleQuery: `host.name: "${SYNTHETIC_HOST}"`,
              index: [SYNTHETIC_INDEX],
              // geo_point is serialized as {lat, lon} object in the list index; the
              // waitForListItem term query uses the raw "lat,lon" string which never
              // matches the stored object. Import uses refresh:wait_for so skip the poll.
              testValues: [],
            });
          });

          it('geo_shape', async () => {
            await runValueListFilterCase({
              listType: 'geo_shape',
              field: 'geo_shape_field',
              listLines: [GEO_WKT],
              ruleQuery: `host.name: "${SYNTHETIC_HOST}"`,
              index: [SYNTHETIC_INDEX],
              // WKT values contain spaces; waitForListItem does not URL-encode the value
              // param, causing malformed requests. Import uses refresh:wait_for so data
              // is already searchable when the POST returns — skip the polling step.
              testValues: [],
            });
          });

          it('shape', async () => {
            await runValueListFilterCase({
              listType: 'shape',
              field: 'shape_field',
              listLines: [CARTESIAN_WKT],
              ruleQuery: `host.name: "${SYNTHETIC_HOST}"`,
              index: [SYNTHETIC_INDEX],
              // Same WKT space issue as geo_shape above.
              testValues: [],
            });
          });

          it('integer_range', async () => {
            await runValueListFilterCase({
              listType: 'integer_range',
              field: 'source.port',
              listLines: ['100-100'],
              ruleQuery: `source.port: 100`,
              index: [SYNTHETIC_INDEX],
              // Range types are serialized as {gte, lte} objects in the list index;
              // the waitForListItem term query uses the raw dash-separated string which
              // never matches. Import uses refresh:wait_for so skip the poll.
              testValues: [],
            });
          });

          it('float_range', async () => {
            await runValueListFilterCase({
              listType: 'float_range',
              field: 'source.port',
              listLines: ['99-101'],
              ruleQuery: `source.port: 100`,
              index: [SYNTHETIC_INDEX],
              // Same {gte, lte} object mismatch as integer_range above.
              testValues: [],
            });
          });

          it('long_range', async () => {
            await runValueListFilterCase({
              listType: 'long_range',
              field: 'source.port',
              listLines: ['100-100'],
              ruleQuery: `source.port: 100`,
              index: [SYNTHETIC_INDEX],
              // Same {gte, lte} object mismatch as integer_range above.
              testValues: [],
            });
          });

          it('double_range', async () => {
            await runValueListFilterCase({
              listType: 'double_range',
              field: 'source.port',
              listLines: ['99-101'],
              ruleQuery: `source.port: 100`,
              index: [SYNTHETIC_INDEX],
              // Same {gte, lte} object mismatch as integer_range above.
              testValues: [],
            });
          });

          it('date_range', async () => {
            await runValueListFilterCase({
              listType: 'date_range',
              field: '@timestamp',
              listLines: ['2019-01-01T00:00:00.000Z,2021-01-01T00:00:00.000Z'],
              ruleQuery: `host.name: "${SYNTHETIC_HOST}"`,
              index: [SYNTHETIC_INDEX],
              // date_range is serialized as {gte, lte} object; also the comma-separated
              // string is not URL-safe in waitForListItem. Import uses refresh:wait_for.
              testValues: [],
            });
          });

          it.skip('binary — ES binary fields are not indexed and cannot be queried with term/terms', () => {
            /* binary type stores base64-encoded data that is stored but never indexed;
               no standard ES query can match against it */
          });
        });

        // A value list is evaluated inline (the "small list" path) only while it stays at or
        // below MAXIMUM_SMALL_VALUE_LIST_SIZE (65536) items. Beyond that it is routed through the
        // per-document "large list" path (filterEventsAgainstList -> searchListItemByValues),
        // which builds its query via getQueryFilterFromTypeValue. These cases confirm the geo and
        // range types round-trip correctly through that path, which requires spatial queries for
        // geo values (a `terms` query is invalid on geo/range fields).
        describe('query rule: large value list exception uses the per-document large-list path', function () {
          this.timeout(600000);

          const LARGE_INDEX = 'value-list-large-list-test';
          const LARGE_HOST = 'value-list-large-list-host';
          const LARGE_MULTI_HOST = 'value-list-large-list-multi-host';
          // Enough items to cross MAXIMUM_SMALL_VALUE_LIST_SIZE (65536), with a little headroom.
          const LARGE_LIST_SIZE = 65540;

          const fillerLines = (make: (i: number) => string): string[] =>
            Array.from({ length: LARGE_LIST_SIZE }, (_, i) => make(i));

          before(async () => {
            await es.indices.delete({ index: LARGE_INDEX }, { ignore: [404] });
            await es.indices.create({
              index: LARGE_INDEX,
              mappings: {
                properties: {
                  host: { properties: { name: { type: 'keyword' } } },
                  '@timestamp': { type: 'date' },
                  source: { properties: { ip: { type: 'ip' }, port: { type: 'integer' } } },
                  geo_location: { type: 'geo_point' },
                  geo_shape_field: { type: 'geo_shape' },
                  shape_field: { type: 'shape' },
                },
              },
            });
            // Single-valued document exercised by the geo and integer_range cases.
            await es.index({
              index: LARGE_INDEX,
              id: 'single',
              document: {
                host: { name: LARGE_HOST },
                '@timestamp': '2020-01-01T00:00:00.000Z',
                source: { ip: '10.0.0.5', port: 100 },
                geo_location: GEO_LAT_LON,
                geo_shape_field: GEO_WKT,
                shape_field: CARTESIAN_WKT,
              },
              refresh: 'wait_for',
            });
            // Multi-valued source.ip document: exercises the range term-per-value expansion
            // (a `terms` query is not supported against range fields).
            await es.index({
              index: LARGE_INDEX,
              id: 'multi',
              document: {
                host: { name: LARGE_MULTI_HOST },
                '@timestamp': '2020-01-01T00:00:00.000Z',
                source: { ip: ['10.0.0.5', '10.0.0.6'] },
              },
              refresh: 'wait_for',
            });
          });

          after(async () => {
            await es.indices.delete({ index: LARGE_INDEX });
          });

          const runLargeValueListFilterCase = async ({
            listType,
            field,
            listLines,
            ruleQuery,
          }: {
            listType: Type;
            field: string;
            listLines: string[];
            ruleQuery: string;
          }) => {
            expect(listLines.length).toBeGreaterThan(65536);
            const valueListId = `vl-large-${listType}-${uuidv4()}.txt`;
            try {
              // Skip per-item polling: geo/range values are stored in a form that differs from the
              // imported string, so a value term query never matches. Wait on the total instead,
              // which also covers the asynchronous indexing of a large import.
              await importFile(supertest, log, listType, listLines, valueListId, []);
              await waitForListSize(supertest, log, valueListId, listLines.length);
              const rule: QueryRuleCreateProps = {
                name: `Large value list ${listType}`,
                description: 'Large value list exception uses the per-document large-list path',
                enabled: true,
                risk_score: 1,
                rule_id: `rule-large-vl-${listType}-${uuidv4()}`,
                severity: 'high',
                index: [LARGE_INDEX],
                type: 'query',
                from: '1900-01-01T00:00:00.000Z',
                query: ruleQuery,
              };
              const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
                [
                  {
                    field,
                    operator: 'included',
                    type: 'list',
                    list: {
                      id: valueListId,
                      type: listType,
                    },
                  },
                ],
              ]);
              // getOpenAlerts waits for the rule to reach "succeeded" before asserting, so a query
              // ES rejects (e.g. a `terms` query on a range field) fails the test rather than
              // silently producing zero alerts.
              const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
              expect(alertsOpen.hits.hits).toHaveLength(0);
            } finally {
              // Delete the list (and its 65k+ items) so successive cases do not accumulate
              // hundreds of thousands of list items, which starves the test environment.
              // ignoreReferences bypasses the rule still referencing the list at this point.
              await supertest
                .delete(`${LIST_URL}?id=${valueListId}&ignoreReferences=true`)
                .set('kbn-xsrf', 'true')
                .send();
            }
          };

          it('geo_point', async () => {
            await runLargeValueListFilterCase({
              listType: 'geo_point',
              field: 'geo_location',
              // Filler points sit near (10, 10), well beyond the 1m match radius of the document
              // point (GEO_LAT_LON); the final entry matches.
              listLines: [...fillerLines((i) => `${(10 + i * 0.0001).toFixed(4)},10`), GEO_LAT_LON],
              ruleQuery: `host.name: "${LARGE_HOST}"`,
            });
          });

          it('geo_shape', async () => {
            await runLargeValueListFilterCase({
              listType: 'geo_shape',
              field: 'geo_shape_field',
              listLines: [
                ...fillerLines((i) => `POINT (10 ${(10 + i * 0.0001).toFixed(4)})`),
                GEO_WKT,
              ],
              ruleQuery: `host.name: "${LARGE_HOST}"`,
            });
          });

          it('shape', async () => {
            await runLargeValueListFilterCase({
              listType: 'shape',
              field: 'shape_field',
              listLines: [...fillerLines((i) => `POINT (${i} 0)`), CARTESIAN_WKT],
              ruleQuery: `host.name: "${LARGE_HOST}"`,
            });
          });

          it('integer_range (single-valued field)', async () => {
            await runLargeValueListFilterCase({
              listType: 'integer_range',
              field: 'source.port',
              // Filler ranges are all well above the document value (100); the final range contains it.
              listLines: [...fillerLines((i) => `${1000 + i}-${1000 + i}`), '90-110'],
              ruleQuery: `host.name: "${LARGE_HOST}"`,
            });
          });

          it('ip_range (multi-valued field expands to one term per value)', async () => {
            await runLargeValueListFilterCase({
              listType: 'ip_range',
              field: 'source.ip',
              // Filler ranges live in 11.0.0.0/8 (never overlapping the 10.0.0.x document values);
              // the final range contains 10.0.0.5, one of the document's multi-valued source.ip entries.
              listLines: [
                ...fillerLines((i) => {
                  const ip = `11.${Math.floor(i / 65536) % 256}.${Math.floor(i / 256) % 256}.${
                    i % 256
                  }`;
                  return `${ip}-${ip}`;
                }),
                '10.0.0.5-10.0.0.5',
              ],
              ruleQuery: `host.name: "${LARGE_MULTI_HOST}"`,
            });
          });
        });

        describe('query rule: medium range value list exception (over inline limit, under large-list threshold) is applied via the per-document path', function () {
          this.timeout(600000);

          const MEDIUM_INDEX = 'value-list-medium-list-test';
          const MEDIUM_HOST = 'value-list-medium-list-host';
          // Over MAXIMUM_SMALL_IP_RANGE_VALUE_LIST_DASH_SIZE (200) so buildListClause cannot inline
          // the clause, but well under MAXIMUM_SMALL_VALUE_LIST_SIZE (65536) so
          // filterOutUnprocessableValueLists still classifies it as a small (inline-bucket) list.
          // Such items must fall through to the per-document large-list path (see the
          // `unprocessedExceptions.push(...)` in build_exception_filter.ts) rather than be silently
          // dropped, which previously happened because `Array.concat` did not mutate the array.
          const MEDIUM_LIST_SIZE = 300;

          before(async () => {
            await es.indices.delete({ index: MEDIUM_INDEX }, { ignore: [404] });
            await es.indices.create({
              index: MEDIUM_INDEX,
              mappings: {
                properties: {
                  host: { properties: { name: { type: 'keyword' } } },
                  '@timestamp': { type: 'date' },
                  source: { properties: { port: { type: 'integer' } } },
                },
              },
            });
            await es.index({
              index: MEDIUM_INDEX,
              id: 'medium-single',
              document: {
                host: { name: MEDIUM_HOST },
                '@timestamp': '2020-01-01T00:00:00.000Z',
                source: { port: 100 },
              },
              refresh: 'wait_for',
            });
          });

          after(async () => {
            await es.indices.delete({ index: MEDIUM_INDEX });
          });

          it('integer_range (201–65,535 items) is applied, not dropped', async () => {
            const listType: Type = 'integer_range';
            const valueListId = `vl-medium-${listType}-${uuidv4()}.txt`;
            // Filler ranges are all well above the document value (100); the final range contains it.
            const listLines = [
              ...Array.from({ length: MEDIUM_LIST_SIZE }, (_, i) => `${1000 + i}-${1000 + i}`),
              '90-110',
            ];
            expect(listLines.length).toBeGreaterThan(200);
            expect(listLines.length).toBeLessThan(65536);
            try {
              // Range values are stored in a form that differs from the imported string, so a value
              // term query never matches; wait on the total instead of per-item polling.
              await importFile(supertest, log, listType, listLines, valueListId, []);
              await waitForListSize(supertest, log, valueListId, listLines.length);
              const rule: QueryRuleCreateProps = {
                name: `Medium value list ${listType}`,
                description:
                  'Medium range value list exception is applied via the per-document large-list path',
                enabled: true,
                risk_score: 1,
                rule_id: `rule-medium-vl-${listType}-${uuidv4()}`,
                severity: 'high',
                index: [MEDIUM_INDEX],
                type: 'query',
                from: '1900-01-01T00:00:00.000Z',
                query: `host.name: "${MEDIUM_HOST}"`,
              };
              const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
                [
                  {
                    field: 'source.port',
                    operator: 'included',
                    type: 'list',
                    list: {
                      id: valueListId,
                      type: listType,
                    },
                  },
                ],
              ]);
              // The document's port (100) is contained by the '90-110' range, so the included
              // exception must suppress it. Before the concat->push fix this medium-sized range
              // list was silently dropped and the document would (incorrectly) alert.
              const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
              expect(alertsOpen.hits.hits).toHaveLength(0);
            } finally {
              await supertest
                .delete(`${LIST_URL}?id=${valueListId}&ignoreReferences=true`)
                .set('kbn-xsrf', 'true')
                .send();
            }
          });
        });

        it('should Not allow deleting value list when there are references and ignoreReferences is false', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['suricata-sensor-amsterdam'], valueListId);
          const rule: QueryRuleCreateProps = {
            ...getSimpleRule(),
            query: 'host.name: "suricata-sensor-amsterdam"',
          };
          await createRuleWithExceptionEntries(supertest, log, rule, [
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

          const deleteReferences = false;
          const ignoreReferences = false;

          // Delete the value list
          await supertest
            .delete(
              `${LIST_URL}?deleteReferences=${deleteReferences}&id=${valueListId}&ignoreReferences=${ignoreReferences}`
            )
            .set('kbn-xsrf', 'true')
            .send()
            .expect(409);
        });
      });
    });
  });
};

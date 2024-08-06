/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  ALERT_WORKFLOW_STATUS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_TERMS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { v4 as uuidv4 } from 'uuid';

import { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { RuleExecutionStatusEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_ORIGINAL_EVENT,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';
import {
  createExceptionList,
  createExceptionListItem,
  getAlerts,
  getPreviewAlerts,
  previewRule,
  patchRule,
  dataGeneratorFactory,
} from '../../../../utils';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
} from '../../../../../../../common/utils/security_solution';

import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

/**
 * Specific _id to use for some of the tests. If the archiver changes and you see errors
 * here, update this to a new value of a chosen auditbeat record and update the tests values.
 */
const ID = 'BhbXBmkBR346wHgn4PeZ';

/**
 * Test coverage:
 * [x] - Happy path generating 1 alert
 * [x] - With exceptions
 * [x] - With suppression
 * [x] - Alerts on alerts
 */

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless @serverlessQA Custom query rule - lucene', () => {
    before(async () => {
      // await deleteAllAlerts(supertest, log, es);
      // await deleteAllRules(supertest, log);
      await esArchiver.load(auditbeatPath);
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/8.8.0', {
        useCreate: true,
        docsOnly: true,
      });
    });

    afterEach(async () => {
      await esDeleteAllIndices('.preview.alerts*');
      await deleteAllRules(supertest, log);
    });

    after(async () => {
      await esArchiver.unload(auditbeatPath);
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/alerts/8.8.0');
      await deleteAllAlerts(supertest, log, es);
      await deleteAllAlerts(supertest, log, es, ['.preview.alerts-security.alerts-*']);
      await deleteAllRules(supertest, log);
    });

    // First test creates a real rule - most remaining tests use preview API
    it('should have the specific audit record for _id or none of these tests below will pass', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: `_id:${ID}`,
        language: 'lucene',
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getAlerts(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).toBeGreaterThan(0);
      expect(alerts.hits.hits[0]._source?.['kibana.alert.ancestors'][0].id).toEqual(ID);
    });

    // This is a sample Lucene query that does NOT match KQL syntax, so we assure that Lucene rules are not
    // just working because they happen to match KQL. We're ensuring that Lucene will be parsed correctly.
    it('should query and get back alert', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query:
          '((event.category: (network OR network_traffic) AND event.type: (tls OR http)) OR event.dataset:(network_traffic.tls OR network_traffic.http)) AND destination.domain:/[a-z]{3}.stage.[0-9]{8}..*/',
        language: 'lucene',
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      const alert = previewAlerts[0]._source;

      expect(alert).toEqual({
        ...alert,
        [ALERT_ANCESTORS]: [
          {
            id: 'a10zJ2oE6v5HJNSHhyxz',
            type: 'event',
            index: 'auditbeat-8.0.0-2019.02.19-000001',
            depth: 0,
          },
        ],
      });
    });

    it('should query and get back expected alert structure when it is a alert on a alert', async () => {
      const alertId = 'eabbdefc23da981f2b74ab58b82622a97bb9878caa11bc914e2adfacc94780f1';
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting([`.alerts-security.alerts-default*`]),
        rule_id: 'alert-on-alert',
        query: `_id:${alertId}`,
        language: 'lucene',
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).toEqual(1);

      const alert = previewAlerts[0]._source;

      if (!alert) {
        return expect(alert).toBeTruthy();
      }
      const alertAncestorIndex = isServerless
        ? /^\.ds-\.alerts-security\.alerts-default-[0-9\.]*-000001$/
        : '.internal.alerts-security.alerts-default-000001';

      expect(alert[ALERT_ANCESTORS]).toEqual([
        {
          id: 'vT9cwocBh3b8EMpD8lsi',
          type: 'event',
          index: '.ds-logs-endpoint.alerts-default-2023.04.27-000001',
          depth: 0,
        },
        {
          rule: '7015a3e2-e4ea-11ed-8c11-49608884878f',
          id: alertId,
          type: 'signal',
          index: expect.any(String),
          depth: 1,
        },
      ]);
      expect(alert[ALERT_ANCESTORS][1].index).toMatch(alertAncestorIndex);
      expect(alert[ALERT_WORKFLOW_STATUS]).toEqual('open');
      expect(alert[ALERT_DEPTH]).toEqual(2);

      expect(alert[ALERT_ORIGINAL_TIME]).toEqual('2023-04-27T11:03:57.906Z');
      expect(alert[`${ALERT_ORIGINAL_EVENT}.agent_id_status`]).toEqual('auth_metadata_missing');
      expect(alert[`${ALERT_ORIGINAL_EVENT}.ingested`]).toEqual('2023-04-27T10:58:03Z');
      expect(alert[`${ALERT_ORIGINAL_EVENT}.dataset`]).toEqual('endpoint');
      expect(alert[`${ALERT_ORIGINAL_EVENT}.ingested`]).toEqual('2023-04-27T10:58:03Z');
    });

    it('should not generate duplicate alerts', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: `_id:${ID}`,
        language: 'lucene',
      };

      const { previewId } = await previewRule({ supertest, rule, invocationCount: 2 });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(1);
    });

    describe('with suppression enabled', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/suppression');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/suppression');
      });

      it('should generate only 1 alert per host name when grouping by host name', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `host.name: "host-0"`,
          language: 'lucene',
          alert_suppression: {
            group_by: ['host.name'],
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T05:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
          ],
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 5,
        });
      });

      it('should generate multiple alerts when multiple host names are found', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `host.name: *`,
          language: 'lucene',
          alert_suppression: {
            group_by: ['host.name'],
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T05:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({ es, previewId, size: 1000 });
        expect(previewAlerts.length).toEqual(3);

        previewAlerts.sort((a, b) =>
          (a._source?.host?.name ?? '0') > (b._source?.host?.name ?? '0') ? 1 : -1
        );

        const hostNames = previewAlerts.map((alert) => alert._source?.host?.name);
        expect(hostNames).toEqual(['host-0', 'host-1', 'host-2']);
        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
          ],
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 5,
        });
      });

      it('should generate alerts when using multiple group by fields', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `host.name: *`,
          language: 'lucene',
          alert_suppression: {
            group_by: ['host.name', 'source.ip'],
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T05:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 1000,
          sort: ['host.name', 'source.ip'],
        });
        expect(previewAlerts.length).toEqual(6);

        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
            {
              field: 'source.ip',
              value: '192.168.1.1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
        });
      });

      it('should not count documents that were covered by previous alerts', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `host.name: *`,
          language: 'lucene',
          alert_suppression: {
            group_by: ['host.name', 'source.ip'],
          },
          // The first invocation covers half of the source docs, the second invocation covers all documents.
          // We will check and make sure the second invocation correctly filters out the first half that
          // were alerted on by the first invocation.
          from: 'now-2h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 1000,
          sort: ['host.name', 'source.ip', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).toEqual(12);

        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
            {
              field: 'source.ip',
              value: '192.168.1.1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
        });

        expect(previewAlerts[1]._source).toEqual({
          ...previewAlerts[1]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
            {
              field: 'source.ip',
              value: '192.168.1.1',
            },
          ],
          // Note: the timestamps here are 1 hour after the timestamps for previewAlerts[0]
          [ALERT_ORIGINAL_TIME]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
        });
      });

      // Only one source document populates destination.ip, but it populates the field with an array
      // so we expect 2 groups to be created from the single document
      it('should generate multiple alerts for a single doc in multiple groups', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `*:*`,
          language: 'lucene',
          alert_suppression: {
            group_by: ['destination.ip'],
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T05:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 1000,
          sort: ['destination.ip'],
        });
        expect(previewAlerts.length).toEqual(3);

        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'destination.ip',
              value: '127.0.0.1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        });

        // We also expect to have a separate group for documents that don't populate the groupBy field
        expect(previewAlerts[2]._source).toEqual({
          ...previewAlerts[2]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'destination.ip',
              value: null,
            },
          ],
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 16,
        });
      });

      it('should correctly deduplicate null values across rule runs', async () => {
        // We set a long lookback then run the rule twice so both runs cover all documents from the test data.
        // The last alert, with null for destination.ip, should be found by the first rule run but not duplicated
        // by the second run.
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `*:*`,
          language: 'lucene',
          alert_suppression: {
            group_by: ['destination.ip'],
          },
          from: 'now-2h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T07:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 1000,
          sort: ['destination.ip'],
        });
        expect(previewAlerts.length).toEqual(3);

        // We also expect to have a separate group for documents that don't populate the groupBy field
        expect(previewAlerts[2]._source).toEqual({
          ...previewAlerts[2]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'destination.ip',
              value: null,
            },
          ],
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 34,
        });
      });

      describe('with a suppression time window', async () => {
        const { indexListOfDocuments } = dataGeneratorFactory({
          es,
          index: 'ecs_compliant',
          log,
        });

        before(async () => {
          await esArchiver.load(
            'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
          );
        });

        after(async () => {
          await esArchiver.unload(
            'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
          );
        });

        it('should update an alert using real rule executions', async () => {
          const id = uuidv4();
          const firstTimestamp = new Date().toISOString();
          const firstDocument = {
            id,
            '@timestamp': firstTimestamp,
            agent: {
              name: 'agent-1',
            },
          };
          await indexListOfDocuments([firstDocument, firstDocument]);

          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['ecs_compliant']),
            rule_id: 'rule-2',
            query: `id:${id}`,
            language: 'lucene',
            alert_suppression: {
              group_by: ['agent.name'],
              duration: {
                value: 300,
                unit: 'm',
              },
            },
          };
          const createdRule = await createRule(supertest, log, rule);
          const alerts = await getAlerts(supertest, log, es, createdRule);
          expect(alerts.hits.hits).toHaveLength(1);
          expect(alerts.hits.hits[0]._source).toEqual({
            ...alerts.hits.hits[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: 'agent-1',
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: firstTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });

          const secondTimestamp = new Date().toISOString();
          const secondDocument = {
            id,
            '@timestamp': secondTimestamp,
            agent: {
              name: 'agent-1',
            },
          };
          // Add a new document, then disable and re-enable to trigger another rule run. The second doc should
          // trigger an update to the existing alert without changing the timestamp
          await indexListOfDocuments([secondDocument, secondDocument]);
          await patchRule(supertest, log, { id: createdRule.id, enabled: false });
          await patchRule(supertest, log, { id: createdRule.id, enabled: true });
          const afterTimestamp = new Date();
          const secondAlerts = await getAlerts(
            supertest,
            log,
            es,
            createdRule,
            RuleExecutionStatusEnum.succeeded,
            undefined,
            afterTimestamp
          );
          expect(secondAlerts.hits.hits.length).toEqual(1);
          expect(secondAlerts.hits.hits[0]._source).toEqual({
            ...secondAlerts.hits.hits[0]._source,
            [TIMESTAMP]: secondAlerts.hits.hits[0]._source?.[TIMESTAMP],
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: 'agent-1',
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 3,
          });
        });
      });
    });

    describe('with exceptions', async () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });
      it('should correctly evaluate rule with exceptions', async () => {
        // create an exception list container of type "detection"
        const {
          id,
          list_id: listId,
          namespace_type: namespaceType,
          type,
        } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'detection',
        });

        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'suricata-sensor-london',
            },
          ],
          list_id: listId,
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
          expire_time: new Date(Date.now() - 1000000).toISOString(),
        });

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: `_id:${ID} or _id:GBbXBmkBR346wHgn5_eR or _id:x10zJ2oE9v5HJNSHhyxi`,
          language: 'lucene',
          exceptions_list: [{ id, list_id: listId, type, namespace_type: namespaceType }],
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(2);
      });
    });

    // https://github.com/elastic/kibana/issues/149920
    // Lucene syntax does not support field name wildcard queries
    describe('field name wildcard queries', async () => {
      const { indexEnhancedDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
        );
      });

      it('should return a parse error exception', async () => {
        const id = uuidv4();
        const firstDoc = { id, agent: { name: 'test-1' } };
        const secondDoc = { id, agent: { name: 'test-2' } };

        await indexEnhancedDocuments({ documents: [firstDoc, firstDoc, secondDoc], id });

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id} AND agent.n*: test-1`,
          language: 'lucene',
          from: 'now-1h',
          interval: '1h',
        };

        const { logs } = await previewRule({
          supertest,
          rule,
        });
        expect(logs[0].errors[0]).toMatch(/ResponseError: search_phase_execution_exception.*/);
      });
    });
  });
};

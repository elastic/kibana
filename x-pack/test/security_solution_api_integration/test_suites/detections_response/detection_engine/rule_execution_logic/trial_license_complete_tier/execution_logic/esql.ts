/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';

import { EsqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema';
import { getCreateEsqlRulesSchemaMock } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema/mocks';
import { RuleExecutionStatusEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';

import { getMaxSignalsWarning as getMaxAlertsWarning } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '@kbn/security-solution-plugin/common/constants';
import {
  getPreviewAlerts,
  previewRule,
  getAlerts,
  dataGeneratorFactory,
  previewRuleWithExceptionEntries,
  removeRandomValuedPropertiesFromAlert,
  patchRule,
} from '../../../../utils';
import {
  deleteAllRules,
  deleteAllAlerts,
  createRule,
} from '../../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const utils = getService('securitySolutionUtils');

  const { indexEnhancedDocuments, indexListOfDocuments, indexGeneratedDocuments } =
    dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });

  /**
   * to separate docs between rules runs
   */
  const internalIdPipe = (id: string) => `| where id=="${id}"`;

  describe('@ess @serverless ES|QL rule type', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    // First test creates a real rule - remaining tests use preview API
    it('should generate 1 alert with during actual rule execution', async () => {
      const id = uuidv4();
      const username = await utils.getUsername();
      const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
      const doc1 = { agent: { name: 'test-1' } };
      const doc2 = { agent: { name: 'test-2' } };
      const ruleQuery = `from ecs_compliant metadata _id, _index, _version ${internalIdPipe(
        id
      )} | where agent.name=="test-1"`;
      const rule: EsqlRuleCreateProps = {
        ...getCreateEsqlRulesSchemaMock('rule-1', true),
        query: ruleQuery,
        from: '2020-10-28T06:00:00.000Z',
        interval: '1h',
      };

      await indexEnhancedDocuments({
        documents: [doc1, doc2],
        interval,
        id,
      });

      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getAlerts(supertest, log, es, createdRule);

      expect(alerts.hits.hits.length).toBe(1);
      expect(removeRandomValuedPropertiesFromAlert(alerts.hits.hits[0]._source)).toEqual({
        'kibana.alert.rule.parameters': {
          description: 'Detecting root and admin users',
          risk_score: 55,
          severity: 'high',
          author: [],
          false_positives: [],
          from: '2020-10-28T06:00:00.000Z',
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
          rule_source: {
            type: 'internal',
          },
          related_integrations: [],
          required_fields: [],
          setup: '',
          type: 'esql',
          language: 'esql',
          query: ruleQuery,
        },
        'kibana.alert.rule.category': 'ES|QL Rule',
        'kibana.alert.rule.consumer': 'siem',
        'kibana.alert.rule.name': 'Query with a rule id',
        'kibana.alert.rule.producer': 'siem',
        'kibana.alert.rule.revision': 0,
        'kibana.alert.rule.rule_type_id': 'siem.esqlRule',
        'kibana.space_ids': ['default'],
        'kibana.alert.rule.tags': [],
        'agent.name': 'test-1',
        id,
        'event.kind': 'signal',
        'kibana.alert.original_time': expect.any(String),
        'kibana.alert.ancestors': [
          { id: expect.any(String), type: 'event', index: 'ecs_compliant', depth: 0 },
        ],
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.depth': 1,
        'kibana.alert.reason': 'event created high alert Query with a rule id.',
        'kibana.alert.severity': 'high',
        'kibana.alert.risk_score': 55,
        'kibana.alert.rule.actions': [],
        'kibana.alert.rule.author': [],
        'kibana.alert.rule.created_by': username,
        'kibana.alert.rule.description': 'Detecting root and admin users',
        'kibana.alert.rule.enabled': true,
        'kibana.alert.rule.exceptions_list': [],
        'kibana.alert.rule.false_positives': [],
        'kibana.alert.rule.from': '2020-10-28T06:00:00.000Z',
        'kibana.alert.rule.immutable': false,
        'kibana.alert.rule.interval': '1h',
        'kibana.alert.rule.indices': [],
        'kibana.alert.rule.max_signals': 100,
        'kibana.alert.rule.references': [],
        'kibana.alert.rule.risk_score_mapping': [],
        'kibana.alert.rule.rule_id': 'rule-1',
        'kibana.alert.rule.severity_mapping': [],
        'kibana.alert.rule.threat': [],
        'kibana.alert.rule.to': 'now',
        'kibana.alert.rule.type': 'esql',
        'kibana.alert.rule.updated_by': username,
        'kibana.alert.rule.version': 1,
        'kibana.alert.workflow_tags': [],
        'kibana.alert.workflow_assignee_ids': [],
        'kibana.alert.rule.risk_score': 55,
        'kibana.alert.rule.severity': 'high',
      });
    });

    it('should generate 1 alert', async () => {
      const id = uuidv4();
      const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
      const doc1 = { agent: { name: 'test-1' } };
      const doc2 = { agent: { name: 'test-2' } };

      const rule: EsqlRuleCreateProps = {
        ...getCreateEsqlRulesSchemaMock('rule-1', true),
        query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
        from: 'now-1h',
        interval: '1h',
      };

      await indexEnhancedDocuments({
        documents: [doc1, doc2],
        interval,
        id,
      });

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
      });

      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        size: 10,
      });

      expect(previewAlerts.length).toBe(1);
      expect(previewAlerts[0]._source).toEqual(
        expect.objectContaining({
          'agent.name': 'test-1',
        })
      );
    });

    it('should not generate alerts out of rule execution time interval', async () => {
      const id = uuidv4();
      const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
      const doc1 = { agent: { name: 'test-1' } };
      const doc2 = { agent: { name: 'test-2' } };

      const rule: EsqlRuleCreateProps = {
        ...getCreateEsqlRulesSchemaMock('rule-1', true),
        query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
        from: 'now-1h',
        interval: '1h',
      };

      await indexEnhancedDocuments({ documents: [doc1, doc1, doc1, doc2, doc2], interval, id });
      await indexEnhancedDocuments({ documents: [doc1, doc2], id });

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
      });

      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        size: 10,
      });

      expect(previewAlerts.length).toBe(3);
    });

    describe('non-aggregating query rules', () => {
      it('should add source document to alert', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = {
          agent: { name: 'test-1', version: '2', type: 'auditbeat' },
          host: { name: 'my-host' },
          client: { ip: '127.0.0.1' },
        };

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          // only _id and agent.name is projected at the end of query pipeline
          query: `from ecs_compliant metadata _id ${internalIdPipe(id)} | keep _id, agent.name`,
          from: 'now-1h',
          interval: '1h',
        };

        await indexEnhancedDocuments({
          documents: [doc1],
          interval,
          id,
        });

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
        });

        expect(previewAlerts.length).toBe(1);
        // all fields from source document should be returned
        expect(previewAlerts[0]._source).toEqual(
          expect.objectContaining({
            'agent.name': 'test-1',
            agent: { version: '2', type: 'auditbeat' },
            host: { name: 'my-host' },
            client: { ip: '127.0.0.1' },
          })
        );
      });

      it('should support deprecated [metadata _id] syntax', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = {
          agent: { name: 'test-1', version: '2', type: 'auditbeat' },
          host: { name: 'my-host' },
          client: { ip: '127.0.0.1' },
        };

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          // only _id and agent.name is projected at the end of query pipeline
          query: `from ecs_compliant [metadata _id] ${internalIdPipe(id)} | keep _id, agent.name`,
          from: 'now-1h',
          interval: '1h',
        };

        await indexEnhancedDocuments({
          documents: [doc1],
          interval,
          id,
        });

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
        });

        expect(previewAlerts.length).toBe(1);
      });

      it('should deduplicate alerts correctly based on source document _id', async () => {
        const id = uuidv4();
        // document will fall into 2 rule execution windows
        const doc1 = {
          id,
          '@timestamp': '2020-10-28T05:55:00.000Z',
          agent: { name: 'test-1', type: 'auditbeat' },
        };

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          // only _id and agent.name is projected at the end of query pipeline
          query: `from ecs_compliant metadata _id ${internalIdPipe(id)} | keep _id, agent.name`,
          from: 'now-45m',
          interval: '30m',
        };

        await indexListOfDocuments([doc1]);

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 2,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
        });

        expect(previewAlerts.length).toBe(1);
      });
    });

    describe('esql query specific syntax', () => {
      it('should return only specified in query fields', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { agent: { name: 'test-1', type: 'auditbeat' } };

        // ESQL query drops agent type and renames agent.name
        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(
            id
          )} | where agent.name=="test-1" | keep agent.name | rename agent.name as custom_named_agent`,
          from: 'now-1h',
          interval: '1h',
        };

        await indexEnhancedDocuments({
          documents: [doc1],
          interval,
          id,
        });

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toBe(1);
        expect(previewAlerts[0]._source).toHaveProperty('custom_named_agent', 'test-1');
        expect(previewAlerts[0]._source).not.toHaveProperty(['agent.name']);
        expect(previewAlerts[0]._source).not.toHaveProperty('agent.name');
        expect(previewAlerts[0]._source).not.toHaveProperty(['agent.type']);
        expect(previewAlerts[0]._source).not.toHaveProperty('agent.type');
      });
    });

    describe('aggregating query rules', () => {
      it('should aggregate results correctly', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { agent: { name: 'test-1' } };
        const doc2 = { agent: { name: 'test-2' } };
        const doc3 = { agent: { name: 'test-3' } };

        // ESQL query counts each distinct value in agent.name
        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(
            id
          )} | stats counted_agents=count(agent.name) by agent.name`,
          from: 'now-1h',
          interval: '1h',
        };

        await indexEnhancedDocuments({
          documents: [doc1, doc1, doc1, doc2, doc2, doc3],
          interval,
          id,
        });

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlertsOrderedByAgentName = await getPreviewAlerts({
          es,
          previewId,
          sort: ['agent.name'],
        });

        expect(previewAlertsOrderedByAgentName.length).toBe(3);
        expect(previewAlertsOrderedByAgentName[0]._source).toEqual(
          expect.objectContaining({
            'agent.name': 'test-1',
            counted_agents: 3,
          })
        );
        expect(previewAlertsOrderedByAgentName[1]._source).toEqual(
          expect.objectContaining({
            'agent.name': 'test-2',
            counted_agents: 2,
          })
        );
        expect(previewAlertsOrderedByAgentName[2]._source).toEqual(
          expect.objectContaining({
            'agent.name': 'test-3',
            counted_agents: 1,
          })
        );
      });

      // in future, these alerts can be suppressed
      // but for now the following test fixes current behaviour when alerts are not suppressed
      it('should generate 2 alerts if events falls into 2 rule executions', async () => {
        const id = uuidv4();
        // document will fall into 2 rule execution windows
        const doc1 = {
          id,
          '@timestamp': '2020-10-28T05:55:00.000Z',
          agent: { name: 'test-1', type: 'auditbeat' },
        };

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | stats _counted=count(agent.name)`,
          from: 'now-45m',
          interval: '30m',
        };

        await indexListOfDocuments([doc1]);

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 2,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
        });

        expect(previewAlerts.length).toBe(2);
        expect(previewAlerts[0]._source).toHaveProperty(['_counted'], 1);
        expect(previewAlerts[1]._source).toHaveProperty(['_counted'], 1);
      });

      // ES|QL query can return row in results when data set is empty
      // to prevent this, query should be written in a way that does not allow such cases
      // but it might be useful to trigger alerts, when there is gap in data injection
      it('should generate 1 alert on empty data set', async () => {
        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant | stats _counted=count(agent.name)`,
          from: 'now-45m',
          interval: '30m',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2012-03-16T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
        });

        expect(previewAlerts.length).toBe(1);
        // no data has been injected during rule execution interval
        expect(previewAlerts[0]._source).toHaveProperty(['_counted'], 0);
      });
    });

    describe('timestamp override and fallback', () => {
      const expectedEventIngested = '2020-10-28T06:00:00.000Z';
      const doc1 = {
        agent: { name: 'test-1' },
        // delayed timestamp out of 1h rule preview
        '@timestamp': '2020-10-28T08:00:00.000Z',
        'event.ingested': expectedEventIngested,
      };
      const doc2 = {
        agent: { name: 'test-1' },
        '@timestamp': '2020-10-28T08:00:00.000Z',
        // event.ingested out of 1h rule preview
        'event.ingested': '2020-10-28T08:00:00.000Z',
      };
      // use fallback to @timestamp
      const doc3 = {
        agent: { name: 'test-1' },
        '@timestamp': expectedEventIngested,
      };

      it('should generate the correct alerts when timestamp_override defined', async () => {
        const id = uuidv4();

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
          timestamp_override: 'event.ingested',
        };

        await indexListOfDocuments([
          { id, ...doc1 },
          { id, ...doc2 },
          { id, ...doc3 },
        ]);

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: ['event.ingested'],
        });

        expect(previewAlerts.length).toBe(2);
        expect(previewAlerts[0]._source).toHaveProperty(['event.ingested'], expectedEventIngested);
        expect(previewAlerts[1]._source).not.toHaveProperty(['event.ingested']);
      });

      it('should generate the correct alerts when timestamp_override defined and fallback disabled', async () => {
        const id = uuidv4();

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
          timestamp_override: 'event.ingested',
          timestamp_override_fallback_disabled: true,
        };

        await indexListOfDocuments([
          { id, ...doc1 },
          { id, ...doc2 },
          { id, ...doc3 },
        ]);

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toBe(1);
        expect(previewAlerts[0]._source).toHaveProperty(['event.ingested'], expectedEventIngested);
      });
    });

    describe('with exceptions', async () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('should apply exceptions', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { agent: { name: 'test-1' }, 'client.ip': '127.0.0.2' };
        const doc2 = { agent: { name: 'test-1' } };
        const doc3 = { agent: { name: 'test-1' }, 'client.ip': '127.0.0.1' };

        await indexEnhancedDocuments({ documents: [doc1, doc2, doc3], interval, id });

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRuleWithExceptionEntries({
          supertest,
          log,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          entries: [
            [
              {
                field: 'client.ip',
                operator: 'included',
                type: 'match',
                value: '127.0.0.1',
              },
            ],
          ],
        });

        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toBe(2);
      });
    });

    describe('max alerts', () => {
      it('generates max alerts warning when circuit breaker is exceeded', async () => {
        const id = uuidv4();
        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
        };

        await indexGeneratedDocuments({
          docsCount: 150,
          seed: () => ({
            id,
            '@timestamp': '2020-10-28T06:00:00.000Z',
            agent: {
              name: `test-1`,
            },
          }),
        });

        const { logs, previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        expect(logs[0].warnings).toEqual(expect.arrayContaining([getMaxAlertsWarning()]));

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 200,
        });

        expect(previewAlerts.length).toBe(100);
      });

      it("doesn't generate max alerts warning when circuit breaker is met but not exceeded", async () => {
        const id = uuidv4();
        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
        };

        await indexGeneratedDocuments({
          docsCount: 100,
          seed: () => ({
            id,
            '@timestamp': '2020-10-28T06:00:00.000Z',
            agent: {
              name: `test-1`,
            },
          }),
        });

        const { logs, previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });
        expect(logs[0].warnings).not.toEqual(expect.arrayContaining([getMaxAlertsWarning()]));

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 200,
        });

        expect(previewAlerts.length).toBe(100);
      });

      it('should work for max alerts > 100', async () => {
        const id = uuidv4();
        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
          max_signals: 150,
        };

        await indexGeneratedDocuments({
          docsCount: 200,
          seed: () => ({
            id,
            '@timestamp': '2020-10-28T06:00:00.000Z',
            agent: {
              name: `test-1`,
            },
          }),
        });

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 200,
        });

        expect(previewAlerts.length).toBe(150);
      });

      // we use actual rule executions, not preview, because for preview API alerts index refresh=false for non suppressed alerts
      // first rule execution catches 130 documents and generates 100 alerts
      // second rule execution catches 150 docs, 120 of which were captured during the first execution and generates only 60 alerts. Because rest are deduplicated
      // so in total 160 alerts should be generated
      it('should generate alerts when docs overlap execution intervals and alerts number reached max_signals in one of the real executions', async () => {
        const id = uuidv4();
        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock(`rule-${id}`, true),
          query: `from ecs_compliant metadata _id ${internalIdPipe(
            id
          )} | keep _id, agent.name | sort agent.name`,
          from: '2020-10-28T05:15:00.000Z',
          to: '2020-10-28T06:00:00.000Z',
          interval: '45m',
          max_signals: 100,
          enabled: true,
        };

        // docs fall in first rule executions
        await indexGeneratedDocuments({
          docsCount: 10,
          seed: (i) => ({
            id,
            '@timestamp': '2020-10-28T05:40:00.000Z',
            agent: {
              name: `00${i}`,
            },
          }),
        });

        // docs fall in both rule executions
        await indexGeneratedDocuments({
          docsCount: 90,
          seed: (i) => ({
            id,
            '@timestamp': '2020-10-28T05:55:00.000Z',
            agent: {
              name: `0${10 + i}`,
            },
          }),
        });

        // docs fall in both rule executions
        await indexGeneratedDocuments({
          docsCount: 30,
          seed: (i) => ({
            id,
            '@timestamp': '2020-10-28T05:55:00.000Z',
            agent: {
              name: 100 + i,
            },
          }),
        });

        // docs fall in second rule execution
        await indexGeneratedDocuments({
          docsCount: 30,
          seed: (i) => ({
            id,
            '@timestamp': '2020-10-28T06:20:00.000Z',
            agent: {
              name: 130 + i,
            },
          }),
        });

        const createdRule = await createRule(supertest, log, rule);

        // first rule run should generate 100 alerts from first 3 batches of index documents
        const alertsResponseFromFirstRuleExecution = await getAlerts(
          supertest,
          log,
          es,
          createdRule,
          // rule has warning, alerts were truncated, thus "partial failure" status
          RuleExecutionStatusEnum['partial failure'],
          200
        );

        // should return 100 alerts
        expect(alertsResponseFromFirstRuleExecution.hits.hits.length).toBe(100);

        // re-trigger rule execution with new interval
        await patchRule(supertest, log, {
          id: createdRule.id,
          enabled: false,
        });
        await patchRule(supertest, log, {
          id: createdRule.id,
          from: '2020-10-28T05:45:00.000Z',
          to: '2020-10-28T06:30:00.000Z',
          enabled: true,
        });

        const alertsResponse = await getAlerts(
          supertest,
          log,
          es,
          createdRule,
          RuleExecutionStatusEnum.succeeded,
          200,
          new Date()
        );

        // should return 160 alerts
        expect(alertsResponse.hits.hits.length).toBe(160);
      });
    });

    describe('alerts enrichment', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/risks');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/risks');
      });

      it('should be enriched with host risk score', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { host: { name: 'host-0' } };

        await indexEnhancedDocuments({ documents: [doc1], interval, id });

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where host.name=="host-0"`,
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toBe(1);

        expect(previewAlerts[0]._source).toHaveProperty('host.risk.calculated_level', 'Low');
        expect(previewAlerts[0]._source).toHaveProperty('host.risk.calculated_score_norm', 1);
      });
    });

    describe('with asset criticality', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/asset_criticality');
        await kibanaServer.uiSettings.update({
          [ENABLE_ASSET_CRITICALITY_SETTING]: true,
        });
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/asset_criticality');
      });

      it('should be enriched alert with criticality_level', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { host: { name: 'host-0' } };

        await indexEnhancedDocuments({ documents: [doc1], interval, id });

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where host.name=="host-0"`,
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toBe(1);

        expect(previewAlerts[0]?._source?.['host.asset.criticality']).toBe('extreme_impact');
      });
    });

    describe('ECS fields validation', () => {
      it('creates alert if ECS field has multifields', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { agent: { name: 'test-1' }, 'observer.os.full': 'full test os' };
        const doc2 = { agent: { name: 'test-2' } };

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant metadata _id ${internalIdPipe(
            id
          )} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
        };

        await indexEnhancedDocuments({
          documents: [doc1, doc2],
          interval,
          id,
        });

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
        });

        expect(previewAlerts.length).toBe(1);
        expect(previewAlerts[0]._source).toHaveProperty(['observer.os.full'], 'full test os');
        // *.text is multifield define in mappings for observer.os.full
        expect(previewAlerts[0]._source).not.toHaveProperty(['observer.os.full.text']);
      });
      // https://github.com/elastic/security-team/issues/7741
      it('creates alert if ECS field has multifields and is not in ruleRegistry ECS map', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = {
          agent: { name: 'test-1' },
          // this field is mapped in alerts index, but not in ruleRegistry ECS map
          'process.entry_leader.name': 'test_process_name',
        };
        const doc2 = { agent: { name: 'test-2' } };

        const rule: EsqlRuleCreateProps = {
          ...getCreateEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant metadata _id ${internalIdPipe(
            id
          )} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
        };

        await indexEnhancedDocuments({
          documents: [doc1, doc2],
          interval,
          id,
        });

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
        });

        expect(previewAlerts.length).toBe(1);
        expect(previewAlerts[0]._source).toHaveProperty(
          ['process.entry_leader.name'],
          'test_process_name'
        );
        expect(previewAlerts[0]._source).not.toHaveProperty(['process.entry_leader.name.text']);
        expect(previewAlerts[0]._source).not.toHaveProperty(['process.entry_leader.name.caseless']);
      });

      describe('non-ecs', () => {
        before(async () => {
          await esArchiver.load(
            'x-pack/test/functional/es_archives/security_solution/ecs_non_compliant'
          );
        });

        after(async () => {
          await esArchiver.unload(
            'x-pack/test/functional/es_archives/security_solution/ecs_non_compliant'
          );
        });

        const { indexEnhancedDocuments: indexEnhancedDocumentsToNonEcs } = dataGeneratorFactory({
          es,
          index: 'ecs_non_compliant',
          log,
        });

        it('creates alert if non ECS field has multifields', async () => {
          const id = uuidv4();
          const interval: [string, string] = [
            '2020-10-28T06:00:00.000Z',
            '2020-10-28T06:10:00.000Z',
          ];
          const doc1 = {
            'random.entry_leader.name': 'random non-ecs field',
          };

          const rule: EsqlRuleCreateProps = {
            ...getCreateEsqlRulesSchemaMock('rule-1', true),
            query: `from ecs_non_compliant metadata _id ${internalIdPipe(id)}`,
            from: 'now-1h',
            interval: '1h',
          };

          await indexEnhancedDocumentsToNonEcs({
            documents: [doc1],
            interval,
            id,
          });

          const { previewId } = await previewRule({
            supertest,
            rule,
            timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          });

          const previewAlerts = await getPreviewAlerts({
            es,
            previewId,
            size: 10,
          });

          expect(previewAlerts.length).toBe(1);
          // all multifields have been indexed, which is expected, seen we don't know original mappings
          expect(previewAlerts[0]._source).toHaveProperty(
            ['random.entry_leader.name'],
            'random non-ecs field'
          );
          expect(previewAlerts[0]._source).toHaveProperty(
            ['random.entry_leader.name.text'],
            'random non-ecs field'
          );
          expect(previewAlerts[0]._source).toHaveProperty(
            ['random.entry_leader.name.caseless'],
            'random non-ecs field'
          );
        });

        it('creates alert if `event.action` ECS field has non-ECS sub-field', async () => {
          // The issue was found by customer and reported in
          // https://github.com/elastic/sdh-security-team/issues/1015
          const id = uuidv4();
          const interval: [string, string] = [
            '2020-10-28T06:00:00.000Z',
            '2020-10-28T06:10:00.000Z',
          ];
          const doc1 = {
            'event.action': 'process',
          };

          const rule: EsqlRuleCreateProps = {
            ...getCreateEsqlRulesSchemaMock('rule-1', true),
            query: `from ecs_non_compliant metadata _id ${internalIdPipe(id)}`,
            from: 'now-1h',
            interval: '1h',
          };

          await indexEnhancedDocumentsToNonEcs({
            documents: [doc1],
            interval,
            id,
          });

          const { logs } = await previewRule({
            supertest,
            rule,
            timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          });

          expect(logs[0].errors.length).toEqual(0);
        });
      });
    });
  });
};

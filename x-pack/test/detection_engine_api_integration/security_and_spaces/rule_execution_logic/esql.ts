/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { orderBy } from 'lodash';

import { EsqlRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { getEsqlRulesSchemaMock } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema/mocks';

import { getMaxSignalsWarning } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
import { deleteAllRules, deleteAllAlerts, getPreviewAlerts, previewRule } from '../../utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { previewRuleWithExceptionEntries } from '../../utils/preview_rule_with_exception_entries';
import { deleteAllExceptions } from '../../../lists_api_integration/utils';
import { dataGeneratorFactory } from '../../utils/data_generator';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const { indexEnhancedDocuments, indexListOfDocuments, indexGeneratedDocuments } =
    dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });

  /**
   * to separate docs between rules run. as ESQL doesn't support return of _id, yet
   * @param id
   * @returns
   */
  const internalIdPipe = (id: string) => `| where id=="${id}"`;

  describe('Esql type rules', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    // First test creates a real rule - remaining tests use preview API

    it('should generate 1 alert', async () => {
      const id = uuidv4();
      const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
      const doc1 = { agent: { name: 'test-1' } };
      const doc2 = { agent: { name: 'test-2' } };

      const rule: EsqlRuleCreateProps = {
        ...getEsqlRulesSchemaMock('rule-1', true),
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

    it('should generate not generate alerts out of rule execution time interval', async () => {
      const id = uuidv4();
      const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
      const doc1 = { agent: { name: 'test-1' } };
      const doc2 = { agent: { name: 'test-2' } };

      const rule: EsqlRuleCreateProps = {
        ...getEsqlRulesSchemaMock('rule-1', true),
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

    describe('esql query specific syntax', () => {
      it('should return only specified in query fields', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { agent: { name: 'test-1', type: 'auditbeat' } };

        // ESQL query drops agent type and renames agent.name
        const rule: EsqlRuleCreateProps = {
          ...getEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(
            id
          )} | where agent.name=="test-1" | keep agent.name | rename custom_named_agent = agent.name`,
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

    describe('grouping query`s rules', () => {
      it('should group results correctly', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { agent: { name: 'test-1' } };
        const doc2 = { agent: { name: 'test-2' } };
        const doc3 = { agent: { name: 'test-3' } };

        // ESQL query counts each distinct value in agent.name
        const rule: EsqlRuleCreateProps = {
          ...getEsqlRulesSchemaMock('rule-1', true),
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

        const previewAlerts = await getPreviewAlerts({ es, previewId });

        const previewAlertsOrderedByAgentName = orderBy(
          previewAlerts,
          ['_source', 'agent.name'],
          'asc'
        );

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
          ...getEsqlRulesSchemaMock('rule-1', true),
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

        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toBe(2);
        expect(previewAlerts[0]._source).toHaveProperty(['event.ingested'], expectedEventIngested);
        expect(previewAlerts[1]._source).not.toHaveProperty(['event.ingested']);
      });

      it('should generate the correct alerts when timestamp_override defined and fallback disabled', async () => {
        const id = uuidv4();

        const rule: EsqlRuleCreateProps = {
          ...getEsqlRulesSchemaMock('rule-1', true),
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
          ...getEsqlRulesSchemaMock('rule-1', true),
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

    describe('max signals', () => {
      it('generates max signals warning when circuit breaker is exceeded', async () => {
        const id = uuidv4();
        const rule: EsqlRuleCreateProps = {
          ...getEsqlRulesSchemaMock('rule-1', true),
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

        expect(logs[0].warnings).toEqual(expect.arrayContaining([getMaxSignalsWarning()]));

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 200,
        });

        expect(previewAlerts.length).toBe(100);
      });

      it("doesn't generate max signals warning when circuit breaker is met but not exceeded", async () => {
        const id = uuidv4();
        const rule: EsqlRuleCreateProps = {
          ...getEsqlRulesSchemaMock('rule-1', true),
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
        expect(logs[0].warnings).not.toEqual(expect.arrayContaining([getMaxSignalsWarning()]));

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 200,
        });

        expect(previewAlerts.length).toBe(100);
      });

      it('should work for max signals > 100', async () => {
        const id = uuidv4();
        const rule: EsqlRuleCreateProps = {
          ...getEsqlRulesSchemaMock('rule-1', true),
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
    });

    describe('alerts enrichment', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/host_risk');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/host_risk');
      });

      it('should be enriched with host risk score', async () => {
        const id = uuidv4();
        const interval: [string, string] = ['2020-10-28T06:00:00.000Z', '2020-10-28T06:10:00.000Z'];
        const doc1 = { host: { name: 'host-0' } };

        await indexEnhancedDocuments({ documents: [doc1], interval, id });

        const rule: EsqlRuleCreateProps = {
          ...getEsqlRulesSchemaMock('rule-1', true),
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
  });
};

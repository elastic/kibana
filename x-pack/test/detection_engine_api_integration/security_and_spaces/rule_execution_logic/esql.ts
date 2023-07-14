/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';

import { EsqlRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { getEsqlRulesSchemaMock } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema/mocks';

import { getMaxSignalsWarning } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
  getOpenSignals,
  getPreviewAlerts,
  previewRule,
} from '../../utils';
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

    describe('timestamp override and fallback', () => {
      it('should generate the correct alerts', async () => {
        const id = uuidv4();
        const rule: EsqlRuleCreateProps = {
          ...getEsqlRulesSchemaMock('rule-1', true),
          query: `from ecs_compliant ${internalIdPipe(id)} | where agent.name=="test-1"`,
          from: 'now-1h',
          interval: '1h',
          timestamp_override: 'event.ingested',
        };
      });
    });

    describe('with exceptions', async () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('should apply exceptions', async () => {
        const id = uuidv4();
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
          entries: [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'match',
                value: 'zeek-sensor-san-francisco',
              },
            ],
          ],
        });
      });
    });

    it('should work for max signals > 100', async () => {});

    describe('alerts should be be enriched', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/host_risk');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/host_risk');
      });

      it('should be enriched with host risk score', async () => {});
    });
  });
};

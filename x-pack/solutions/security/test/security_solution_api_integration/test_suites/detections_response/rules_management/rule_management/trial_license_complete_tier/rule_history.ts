/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getCustomQueryRuleParams } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

const CHANGE_HISTORY_DATA_STREAM = '.kibana_change_history';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const es = getService('es');
  const log = getService('log');

  const refreshHistory = async () => {
    await es.indices.refresh({ index: CHANGE_HISTORY_DATA_STREAM });
  };

  // Skipped until a feature flag in @kbn/change-history package is enabled
  describe.skip('@ess @serverless @serverlessQA rule history API', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      try {
        await es.deleteByQuery({
          index: CHANGE_HISTORY_DATA_STREAM,
          query: { match_all: {} },
          conflicts: 'proceed',
          refresh: true,
        });
      } catch {
        // Change history index may not exist
      }
    });

    it('returns the rule_create record for a newly-created rule', async () => {
      const { body: rule } = await detectionsApi
        .createRule({
          body: getCustomQueryRuleParams(),
        })
        .expect(200);

      await refreshHistory();

      const { body } = await detectionsApi
        .ruleChangesHistory({ params: { ruleId: rule.id }, query: {} })
        .expect(200);

      expect(body.page).toBe(1);
      expect(body.perPage).toBe(20);
      expect(body.total).toBe(1);
      expect(body.items).toHaveLength(1);

      const [item] = body.items;
      expect(item.action).toBe('rule_create');
      expect(item.user).toEqual({ name: 'elastic' });
      expect(item.rule).toMatchObject({ id: rule.id, revision: 0 });
      // No predecessor for the creation event.
      expect(item.old_values).toBeNull();
    });

    it('returns 404 when the rule does not exist', async () => {
      await detectionsApi
        .ruleChangesHistory({ params: { ruleId: uuidv4() }, query: {} })
        .expect(404);
    });

    it('rejects the request when the "ruleId" path parameter is missing', async () => {
      // @ts-expect-error testing missing id
      await detectionsApi.ruleChangesHistory({ params: {}, query: {} }).expect(400);
    });

    it('rejects the request when per_page exceeds the maximum', async () => {
      const { body: rule } = await detectionsApi
        .createRule({
          body: getCustomQueryRuleParams(),
        })
        .expect(200);

      await detectionsApi
        .ruleChangesHistory({ params: { ruleId: rule.id }, query: { per_page: 101 } })
        .expect(400);
    });

    describe('pagination', () => {
      let ruleId: string;

      beforeEach(async () => {
        // Create the rule (revision 0, rule_create) and update it four times
        // (revisions 1-4, rule_update) so there are 5 history records.
        const { body: rule } = await detectionsApi
          .createRule({
            body: getCustomQueryRuleParams(),
          })
          .expect(200);

        ruleId = rule.id;

        for (let i = 1; i <= 4; i++) {
          await detectionsApi
            .updateRule({
              body: getCustomQueryRuleParams({ rule_id: rule.rule_id, name: `name-${i}` }),
            })
            .expect(200);
        }

        await refreshHistory();
      });

      it('returns the requested page with the right size and total', async () => {
        const { body } = await detectionsApi
          .ruleChangesHistory({ params: { ruleId }, query: { page: 1, per_page: 2 } })
          .expect(200);

        expect(body.total).toBe(5);
        expect(body.page).toBe(1);
        expect(body.perPage).toBe(2);
        expect(body.items).toHaveLength(2);
        expect(body.items[0].rule.revision).toBe(4);
        expect(body.items[1].rule.revision).toBe(3);
      });

      it('returns subsequent pages without overlap', async () => {
        const { body: page2 } = await detectionsApi
          .ruleChangesHistory({ params: { ruleId }, query: { page: 2, per_page: 2 } })
          .expect(200);

        expect(page2.items).toHaveLength(2);
        expect(page2.items[0].rule.revision).toBe(2);
        expect(page2.items[1].rule.revision).toBe(1);
      });

      it('returns fewer items on the last partial page', async () => {
        const { body: page3 } = await detectionsApi
          .ruleChangesHistory({ params: { ruleId }, query: { page: 3, per_page: 2 } })
          .expect(200);

        expect(page3.items).toHaveLength(1);
        expect(page3.items[0].rule.revision).toBe(0);
        // Creation event has no predecessor.
        expect(page3.items[0].old_values).toBeNull();
      });

      it('computes `old_values` against the next-older revision across page boundaries', async () => {
        // Oldest item on page 1 (revision 3) should still see revision 2 as
        // its predecessor — provided by the perPage+1 lookback fetch.
        const { body: page1 } = await detectionsApi
          .ruleChangesHistory({ params: { ruleId }, query: { page: 1, per_page: 2 } })
          .expect(200);

        expect(page1.items[1].old_values).not.toBeNull();
        expect(page1.items[1].old_values.revision).toBe(2);
      });
    });

    describe('field-level changes (old_values merge patch)', () => {
      it('emits only the changed top-level field in `old_values`', async () => {
        const { body: rule } = await detectionsApi
          .createRule({
            body: getCustomQueryRuleParams({ name: 'name-A' }),
          })
          .expect(200);

        await detectionsApi
          .updateRule({
            body: getCustomQueryRuleParams({ rule_id: rule.rule_id, name: 'name-B' }),
          })
          .expect(200);

        await refreshHistory();

        const { body } = await detectionsApi
          .ruleChangesHistory({ params: { ruleId: rule.id }, query: {} })
          .expect(200);

        expect(body.total).toBe(2);
        // Newest (revision 1, name='name-B') first; old_values reflects the
        // single field that differs from revision 0.
        expect(body.items[0].rule.name).toBe('name-B');
        expect(body.items[0].old_values?.name).toBe('name-A');
      });

      it('emits multiple changed fields in a single patch', async () => {
        const { body: rule } = await detectionsApi
          .createRule({
            body: getCustomQueryRuleParams({ name: 'name-A', tags: ['x'] }),
          })
          .expect(200);

        await detectionsApi
          .updateRule({
            body: getCustomQueryRuleParams({
              rule_id: rule.rule_id,
              name: 'name-B',
              tags: ['x', 'y'],
            }),
          })
          .expect(200);

        await refreshHistory();

        const { body } = await detectionsApi
          .ruleChangesHistory({ params: { ruleId: rule.id }, query: {} })
          .expect(200);

        expect(body.items[0].old_values?.name).toBe('name-A');
        expect(body.items[0].old_values?.tags).toEqual(['x']);
      });

      it('returns null `old_values` for the creation event', async () => {
        const { body: rule } = await detectionsApi
          .createRule({
            body: getCustomQueryRuleParams(),
          })
          .expect(200);

        await refreshHistory();

        const { body } = await detectionsApi
          .ruleChangesHistory({ params: { ruleId: rule.id }, query: {} })
          .expect(200);

        expect(body.items[0].old_values).toBeNull();
      });
    });
  });
};

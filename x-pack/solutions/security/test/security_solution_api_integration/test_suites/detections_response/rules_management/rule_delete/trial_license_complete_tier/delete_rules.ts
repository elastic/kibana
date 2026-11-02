/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '@kbn/detections-response-ftr-services';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
} from '../../../utils';
import { deleteAllGaps } from '../../../utils/event_log/delete_all_gaps';
import { generateGapsForRule } from '../../../utils/event_log/generate_gaps_for_rule';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');
  const retry = getService('retry');

  const EVENT_LOG_DATA_STREAM = '.kibana-event-log-ds';

  const countGaps = async (ruleId: string, { deleted }: { deleted: boolean }) => {
    await es.indices.refresh({ index: EVENT_LOG_DATA_STREAM });
    const deletedClause = { term: { 'kibana.alert.rule.gap.deleted': true } };
    const { count } = await es.count({
      index: EVENT_LOG_DATA_STREAM,
      query: {
        bool: {
          must: [
            { term: { 'event.action': 'gap' } },
            { term: { 'event.provider': 'alerting' } },
            { term: { 'rule.id': ruleId } },
            ...(deleted ? [deletedClause] : []),
          ],
          must_not: deleted ? [] : [deletedClause],
        },
      },
    });
    return count;
  };

  describe('@ess @serverless @skipInServerlessMKI delete_rules', () => {
    describe('deleting rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should delete a single rule with a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // delete the rule by its rule_id
        const { body } = await detectionsApi
          .deleteRule({ query: { rule_id: 'rule-1' } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should delete a single rule using an auto generated rule_id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        // delete that rule by its auto-generated rule_id
        const { body } = await detectionsApi
          .deleteRule({ query: { rule_id: bodyWithCreatedRule.rule_id } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should delete a single rule using an auto generated id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRule());

        // delete that rule by its auto-generated id
        const { body } = await detectionsApi
          .deleteRule({ query: { id: bodyWithCreatedRule.id } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should return an error if the id does not exist when trying to delete it', async () => {
        const { body } = await detectionsApi
          .deleteRule({ query: { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' } })
          .expect(404);

        expect(body).to.eql({
          message: 'id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" not found',
          status_code: 404,
        });
      });

      it('should return an error if the rule_id does not exist when trying to delete it', async () => {
        const { body } = await detectionsApi
          .deleteRule({ query: { rule_id: 'fake_id' } })
          .expect(404);

        expect(body).to.eql({
          message: 'rule_id: "fake_id" not found',
          status_code: 404,
        });
      });
    });

    describe('gap soft-deletion', () => {
      // Gaps go first: deleting rules starts a background soft-delete of their gaps,
      // which would race with the delete_by_query and cause version conflicts.
      afterEach(async () => {
        await deleteAllGaps(es);
        await deleteAllRules(supertest, log);
      });

      it('should soft-delete the gaps of the deleted rule and leave other rules untouched', async () => {
        const deletedRule = await createRule(supertest, log, getSimpleRule('rule-to-delete'));
        const keptRule = await createRule(supertest, log, getSimpleRule('rule-to-keep'));

        await generateGapsForRule(es, { id: deletedRule.id, name: deletedRule.name }, 5);
        await generateGapsForRule(es, { id: keptRule.id, name: keptRule.name }, 3);
        expect(await countGaps(deletedRule.id, { deleted: false })).to.be(5);
        expect(await countGaps(keptRule.id, { deleted: false })).to.be(3);

        await detectionsApi.deleteRule({ query: { rule_id: 'rule-to-delete' } }).expect(200);

        // Gap soft-deletion runs in the background after the API responds, so the
        // assertions must poll until the update_by_query has completed.
        await retry.tryForTime(30_000, async () => {
          expect(await countGaps(deletedRule.id, { deleted: true })).to.be(5);
          expect(await countGaps(deletedRule.id, { deleted: false })).to.be(0);
        });
        expect(await countGaps(keptRule.id, { deleted: false })).to.be(3);
      });

      it('should soft-delete gaps when deleting a rule by its id', async () => {
        const createdRule = await createRule(supertest, log, getSimpleRule('rule-by-id'));
        await generateGapsForRule(es, { id: createdRule.id, name: createdRule.name }, 4);

        await detectionsApi.deleteRule({ query: { id: createdRule.id } }).expect(200);

        await retry.tryForTime(30_000, async () => {
          expect(await countGaps(createdRule.id, { deleted: true })).to.be(4);
          expect(await countGaps(createdRule.id, { deleted: false })).to.be(0);
        });
      });
    });
  });
};

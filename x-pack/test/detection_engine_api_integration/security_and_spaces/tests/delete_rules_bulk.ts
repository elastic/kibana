/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../legacy/plugins/siem/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
} from './utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  describe('delete_rules_bulk', () => {
    describe('deleting rules bulk using DELETE', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
      });

      it('should delete a single rule with a rule_id', async () => {
        // add a rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // delete the rule in bulk
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .set('kbn-xsrf', 'true')
          .send([{ rule_id: 'rule-1' }])
          .query()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should delete a single rule using an auto generated rule_id', async () => {
        // add a rule without a rule_id
        const { body: bodyWithCreatedRule } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRuleWithoutRuleId())
          .expect(200);

        // delete that rule by its rule_id
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ rule_id: bodyWithCreatedRule.rule_id }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should delete a single rule using an auto generated id', async () => {
        // add a rule
        const { body: bodyWithCreatedRule } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // delete that rule by its id
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ id: bodyWithCreatedRule.id }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return an error if the ruled_id does not exist when trying to delete a rule_id', async () => {
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ rule_id: 'fake_id' }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "fake_id" not found',
              status_code: 404,
            },
            rule_id: 'fake_id',
          },
        ]);
      });

      it('should return an error if the id does not exist when trying to delete an id', async () => {
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ id: 'fake_id' }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'id: "fake_id" not found',
              status_code: 404,
            },
            id: 'fake_id',
          },
        ]);
      });

      it('should delete a single rule using an auto generated rule_id but give an error if the second rule does not exist', async () => {
        // add the rule
        const { body: bodyWithCreatedRule } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRuleWithoutRuleId())
          .expect(200);

        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ id: bodyWithCreatedRule.id }, { id: 'fake_id' }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect([bodyToCompare, body[1]]).to.eql([
          getSimpleRuleOutputWithoutRuleId(),
          { id: 'fake_id', error: { status_code: 404, message: 'id: "fake_id" not found' } },
        ]);
      });
    });

    // This is a repeat of the tests above but just using POST instead of DELETE
    describe('deleting rules bulk using POST', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
      });

      it('should delete a single rule with a rule_id', async () => {
        // add a rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'foo')
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // delete the rule in bulk
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .set('kbn-xsrf', 'true')
          .send([{ rule_id: 'rule-1' }])
          .query()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should delete a single rule using an auto generated rule_id', async () => {
        // add a rule without a rule_id
        const { body: bodyWithCreatedRule } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRuleWithoutRuleId())
          .expect(200);

        // delete that rule by its rule_id
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ rule_id: bodyWithCreatedRule.rule_id }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should delete a single rule using an auto generated id', async () => {
        // add a rule
        const { body: bodyWithCreatedRule } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // delete that rule by its id
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ id: bodyWithCreatedRule.id }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return an error if the ruled_id does not exist when trying to delete a rule_id', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ rule_id: 'fake_id' }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "fake_id" not found',
              status_code: 404,
            },
            rule_id: 'fake_id',
          },
        ]);
      });

      it('should return an error if the id does not exist when trying to delete an id', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ id: 'fake_id' }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'id: "fake_id" not found',
              status_code: 404,
            },
            id: 'fake_id',
          },
        ]);
      });

      it('should delete a single rule using an auto generated rule_id but give an error if the second rule does not exist', async () => {
        // add the rule
        const { body: bodyWithCreatedRule } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRuleWithoutRuleId())
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
          .send([{ id: bodyWithCreatedRule.id }, { id: 'fake_id' }])
          .set('kbn-xsrf', 'true')
          .query()
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect([bodyToCompare, body[1]]).to.eql([
          getSimpleRuleOutputWithoutRuleId(),
          { id: 'fake_id', error: { status_code: 404, message: 'id: "fake_id" not found' } },
        ]);
      });
    });
  });
};

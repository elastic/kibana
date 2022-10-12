/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperuserAtSpace1 } from '../../../scenarios';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('bulkDeleteRules', () => {
    const objectRemover = new ObjectRemover(supertest);
    after(() => objectRemover.removeAll());

    it('should handle bulk delete of one rule appropriately based on id', async () => {
      const { user, space } = SuperuserAtSpace1;

      const { body: createdRule1 } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['foo'] }))
        .expect(200);

      const response = await supertestWithoutAuth
        .patch(`${getUrlPrefix(space.id)}/api/alerting/rules/_bulk_delete`)
        .set('kbn-xsrf', 'foo')
        .send({ ids: [createdRule1.id] })
        .auth(user.username, user.password);

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({ errors: [], total: 1 });
    });

    it('should handle bulk delete of several rules ids appropriately based on ids', async () => {
      const { user, space } = SuperuserAtSpace1;

      const rules = await Promise.all(
        Array.from({ length: 3 }).map(() =>
          supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData({ tags: ['multiple-rules-edit'] }))
            .expect(200)
        )
      );

      const response = await supertestWithoutAuth
        .patch(`${getUrlPrefix(space.id)}/api/alerting/rules/_bulk_delete`)
        .set('kbn-xsrf', 'foo')
        .send({ ids: rules.map((rule) => rule.body.id) })
        .auth(user.username, user.password);

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({ errors: [], total: 3 });
    });

    it('should handle bulk delete of several rules ids appropriately based on filter', async () => {
      const { user, space } = SuperuserAtSpace1;

      await Promise.all(
        Array.from({ length: 3 }).map(() =>
          supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData({ tags: ['multiple-rules-edit'] }))
            .expect(200)
        )
      );

      const response = await supertestWithoutAuth
        .patch(`${getUrlPrefix(space.id)}/api/alerting/rules/_bulk_delete`)
        .set('kbn-xsrf', 'foo')
        .send({ filter: `alert.attributes.tags: "multiple-rules-edit"` })
        .auth(user.username, user.password);

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({ errors: [], total: 3 });
    });

    it('should throw an error when bulk delete of rules when both ids and filter supplied in payload', async () => {
      const { user, space } = SuperuserAtSpace1;

      const { body: createdRule1 } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['foo'] }))
        .expect(200);

      const response = await supertestWithoutAuth
        .patch(`${getUrlPrefix(space.id)}/api/alerting/rules/_bulk_delete`)
        .set('kbn-xsrf', 'foo')
        .send({ filter: 'fake_filter', ids: [createdRule1.id] })
        .auth(user.username, user.password);

      expect(response.statusCode).to.eql(400);
      expect(response.body.message).to.eql(
        "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
      );
    });

    it('should handle bulk delete of rules when one of deletions throw an error', async () => {
      const { user, space } = SuperuserAtSpace1;

      const rules = await Promise.all(
        Array.from({ length: 3 }).map(() =>
          supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData({ tags: ['multiple-rules-edit'] }))
            .expect(200)
        )
      );

      const response = await supertestWithoutAuth
        .patch(`${getUrlPrefix(space.id)}/api/alerting/rules/_bulk_delete`)
        .set('kbn-xsrf', 'foo')
        .send({ ids: rules.map((rule) => rule.body.id) })
        .auth(user.username, user.password);

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({ errors: [], total: 3 });
    });

    it('shouldn not update rule from another space', async () => {
      const { user, space } = SuperuserAtSpace1;

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);

      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix('other')}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .auth(user.username, user.password)
        .send({ ids: [createdRule.id] });

      expect(response.body).to.eql({
        error: 'Forbidden',
        message: 'Unauthorized to find rules for any rule types',
        statusCode: 403,
      });
      expect(response.statusCode).to.eql(403);
    });
  });
};

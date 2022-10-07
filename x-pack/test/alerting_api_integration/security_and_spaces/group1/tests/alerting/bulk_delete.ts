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

    it('happy path', async () => {
      const { user, space } = SuperuserAtSpace1;

      const { body: createdRule1 } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['foo'] }))
        .expect(200);
      const { body: createdRule2 } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['foo'] }))
        .expect(200);

      const response = await supertestWithoutAuth
        .patch(`${getUrlPrefix(space.id)}/api/alerting/rules/_bulk_delete`)
        .set('kbn-xsrf', 'foo')
        .send({ ids: [createdRule1.id, createdRule2.id] })
        .auth(user.username, user.password);

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({ errors: [], total: 2 });
    });
  });
};

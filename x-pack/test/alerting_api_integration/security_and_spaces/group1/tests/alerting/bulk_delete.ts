/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperuserAtSpace1 } from '../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('bulkDeleteRules', () => {
    const objectRemover = new ObjectRemover(supertest);
    after(() => objectRemover.removeAll());

    const ids = ['fake_rule_id_1', 'fake_rule_id_2', 'fake_rule_id_3'];
    const params = { ids };

    it('happy path', async () => {
      const { user, space } = SuperuserAtSpace1;

      const response = await supertestWithoutAuth
        .patch(`${getUrlPrefix(space.id)}/api/alerting/rules/_bulk_delete`)
        .set('kbn-xsrf', 'foo')
        .send(params)
        .auth(user.username, user.password);

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({});
    });
  });
};

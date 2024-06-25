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

  describe('resolve', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    describe('Actions', () => {
      const { user, space } = SuperuserAtSpace1;

      it('should return the actions correctly', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY action',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);

        const { body: createdRule1 } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: true,
              actions: [
                {
                  id: createdAction.id,
                  group: 'default',
                  params: {},
                },
                {
                  id: 'system-connector-test.system-action',
                  params: {},
                },
              ],
            })
          )
          .expect(200);

        objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');

        const response = await supertestWithoutAuth
          .get(`${getUrlPrefix(space.id)}/internal/alerting/rule/${createdRule1.id}/_resolve`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password);

        const action = response.body.actions[0];
        const systemAction = response.body.actions[1];
        const { uuid, ...restAction } = action;
        const { uuid: systemActionUuid, ...restSystemAction } = systemAction;

        expect([restAction, restSystemAction]).to.eql([
          {
            id: createdAction.id,
            connector_type_id: 'test.noop',
            group: 'default',
            params: {},
          },
          {
            id: 'system-connector-test.system-action',
            connector_type_id: 'test.system-action',
            params: {},
          },
          ,
        ]);
      });
    });
  });
};

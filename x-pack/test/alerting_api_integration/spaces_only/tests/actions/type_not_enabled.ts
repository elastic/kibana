/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const PREWRITTEN_ACTION_ID = 'uuid-actionId';
const DISABLED_ACTION_TYPE = 'test.not-enabled';

// eslint-disable-next-line import/no-default-export
export default function typeNotEnabledTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('actionType not enabled', () => {
    // loads action PREWRITTEN_ACTION_ID with actionType DISABLED_ACTION_TYPE
    before(() => esArchiver.load('alerting'));
    after(() => esArchiver.unload('alerting'));

    it('should handle create action with disabled actionType request appropriately', async () => {
      const response = await supertest
        .post(`/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          actionTypeId: DISABLED_ACTION_TYPE,
        });

      expect(response.statusCode).to.eql(400);
      expect(response.body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'action type "test.not-enabled" is not enabled in the Kibana config xpack.actions.enabledActionTypes',
      });
    });

    it(`should handle execute request with disabled actionType appropriately`, async () => {
      const response = await supertest
        .post(`/api/action/${PREWRITTEN_ACTION_ID}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {},
        });

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({
        status: 'error',
        retry: false,
        actionId: PREWRITTEN_ACTION_ID,
        message:
          'action type "test.not-enabled" is not enabled in the Kibana config xpack.actions.enabledActionTypes',
      });
    });

    it('should handle get action request with disabled actionType appropriately', async () => {
      const response = await supertest.get(`/api/action/${PREWRITTEN_ACTION_ID}`);

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({
        actionTypeId: 'test.not-enabled',
        config: {},
        id: 'uuid-actionId',
        name: 'an action created before test.not-enabled was disabled',
      });
    });

    it('should handle update action request with disabled actionType appropriately', async () => {
      const responseUpdate = await supertest
        .put(`/api/action/${PREWRITTEN_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'an action created before test.not-enabled was disabled (updated)',
        });

      expect(responseUpdate.statusCode).to.eql(200);
      expect(responseUpdate.body).to.eql({
        actionTypeId: 'test.not-enabled',
        config: {},
        id: 'uuid-actionId',
        name: 'an action created before test.not-enabled was disabled (updated)',
      });

      const response = await supertest.get(`/api/action/${PREWRITTEN_ACTION_ID}`);
      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({
        actionTypeId: 'test.not-enabled',
        config: {},
        id: 'uuid-actionId',
        name: 'an action created before test.not-enabled was disabled (updated)',
      });
    });

    it('should handle delete action request with disabled actionType appropriately', async () => {
      let response;

      response = await supertest
        .delete(`/api/action/${PREWRITTEN_ACTION_ID}`)
        .set('kbn-xsrf', 'foo');
      expect(response.statusCode).to.eql(204);

      response = await supertest.get(`/api/action/${PREWRITTEN_ACTION_ID}`);
      expect(response.statusCode).to.eql(404);
    });
  });
}

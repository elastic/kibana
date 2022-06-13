/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    before(() => esArchiver.load('x-pack/test/functional/es_archives/actions'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/actions'));

    it('should handle create action with disabled actionType request appropriately', async () => {
      const response = await supertest.post(`/api/actions/action`).set('kbn-xsrf', 'foo').send({
        name: 'My action',
        actionTypeId: DISABLED_ACTION_TYPE,
      });

      expect(response.status).to.eql(403);
      expect(response.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'action type "test.not-enabled" is not enabled in the Kibana config xpack.actions.enabledActionTypes',
      });
    });

    it(`should handle execute request with disabled actionType appropriately`, async () => {
      const response = await supertest
        .post(`/api/actions/action/${PREWRITTEN_ACTION_ID}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {},
        });

      expect(response.status).to.eql(403);
      expect(response.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'action type "test.not-enabled" is not enabled in the Kibana config xpack.actions.enabledActionTypes',
      });
    });

    it('should handle get action request with disabled actionType appropriately', async () => {
      const response = await supertest.get(`/api/actions/action/${PREWRITTEN_ACTION_ID}`);

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        actionTypeId: 'test.not-enabled',
        config: {},
        id: 'uuid-actionId',
        isPreconfigured: false,
        isDeprecated: false,
        isMissingSecrets: false,
        name: 'an action created before test.not-enabled was disabled',
      });
    });

    it('should handle update action request with disabled actionType appropriately', async () => {
      const responseUpdate = await supertest
        .put(`/api/actions/action/${PREWRITTEN_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'an action created before test.not-enabled was disabled (updated)',
        });

      expect(responseUpdate.status).to.eql(403);
      expect(responseUpdate.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'action type "test.not-enabled" is not enabled in the Kibana config xpack.actions.enabledActionTypes',
      });

      const response = await supertest.get(`/api/actions/action/${PREWRITTEN_ACTION_ID}`);
      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        actionTypeId: 'test.not-enabled',
        config: {},
        id: 'uuid-actionId',
        isPreconfigured: false,
        isDeprecated: false,
        isMissingSecrets: false,
        name: 'an action created before test.not-enabled was disabled',
      });
    });

    it('should handle delete action request with disabled actionType appropriately', async () => {
      let response;

      response = await supertest
        .delete(`/api/actions/action/${PREWRITTEN_ACTION_ID}`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);

      response = await supertest.get(`/api/actions/action/${PREWRITTEN_ACTION_ID}`);
      expect(response.status).to.eql(404);
    });
  });
}

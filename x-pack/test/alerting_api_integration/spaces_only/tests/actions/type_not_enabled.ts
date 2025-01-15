/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const PREWRITTEN_CONNECTOR_ID = 'uuid-actionId';
const DISABLED_CONNECTOR_TYPE = 'test.not-enabled';

// eslint-disable-next-line import/no-default-export
export default function typeNotEnabledTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('connectorType not enabled', () => {
    // loads connector PREWRITTEN_CONNECTOR_ID with connectorType DISABLED_CONNECTOR_TYPE
    before(() => esArchiver.load('x-pack/test/functional/es_archives/actions'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/actions'));

    it('should handle create connector with disabled connector type request appropriately', async () => {
      const response = await supertest.post(`/api/actions/connector`).set('kbn-xsrf', 'foo').send({
        name: 'My connector',
        connector_type_id: DISABLED_CONNECTOR_TYPE,
      });

      expect(response.status).to.eql(403);
      expect(response.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'action type "test.not-enabled" is not enabled in the Kibana config xpack.actions.enabledActionTypes',
      });
    });

    it(`should handle execute request with disabled connector type appropriately`, async () => {
      const response = await supertest
        .post(`/api/actions/connector/${PREWRITTEN_CONNECTOR_ID}/_execute`)
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

    it('should handle get connector request with disabled connector type appropriately', async () => {
      const response = await supertest.get(`/api/actions/connector/${PREWRITTEN_CONNECTOR_ID}`);

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        connector_type_id: 'test.not-enabled',
        config: {},
        id: 'uuid-actionId',
        is_preconfigured: false,
        is_deprecated: false,
        is_system_action: false,
        is_missing_secrets: false,
        name: 'an action created before test.not-enabled was disabled',
      });
    });

    it('should handle update connector request with disabled connector type appropriately', async () => {
      const responseUpdate = await supertest
        .put(`/api/actions/connector/${PREWRITTEN_CONNECTOR_ID}`)
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

      const response = await supertest.get(`/api/actions/connector/${PREWRITTEN_CONNECTOR_ID}`);
      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        connector_type_id: 'test.not-enabled',
        config: {},
        id: 'uuid-actionId',
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        is_system_action: false,
        name: 'an action created before test.not-enabled was disabled',
      });
    });

    it('should handle delete connector request with disabled connector type appropriately', async () => {
      let response;

      response = await supertest
        .delete(`/api/actions/connector/${PREWRITTEN_CONNECTOR_ID}`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);

      response = await supertest.get(`/api/actions/connector/${PREWRITTEN_CONNECTOR_ID}`);
      expect(response.status).to.eql(404);
    });
  });
}

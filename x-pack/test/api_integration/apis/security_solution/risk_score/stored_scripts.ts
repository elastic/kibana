/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  RISK_SCORE_CREATE_STORED_SCRIPT,
  RISK_SCORE_DELETE_STORED_SCRIPT,
} from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createStoredScriptsOptions } from './mocks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Stored scripts', () => {
    it('create a stored script', async () => {
      const response = await supertest
        .put(RISK_SCORE_CREATE_STORED_SCRIPT)
        .set('kbn-xsrf', 'true')
        .send(createStoredScriptsOptions);

      expect(response.status).to.be(200);
      expect(response.text).to.be(JSON.stringify(createStoredScriptsOptions));
    });

    it('update a stored script', async () => {
      const response = await supertest
        .put(RISK_SCORE_CREATE_STORED_SCRIPT)
        .set('kbn-xsrf', 'true')
        .send(createStoredScriptsOptions);

      expect(response.status).to.be(200);
      expect(response.text).to.be(JSON.stringify(createStoredScriptsOptions));
    });

    it('delete a stored script', async () => {
      const response = await supertest
        .delete(RISK_SCORE_DELETE_STORED_SCRIPT)
        .set('kbn-xsrf', 'true')
        .send({
          id: 'ml_hostriskscore_levels_script',
        });

      expect(response.status).to.be(200);
      expect(response.text).to.be('{"id":"ml_hostriskscore_levels_script"}');
    });
  });
}

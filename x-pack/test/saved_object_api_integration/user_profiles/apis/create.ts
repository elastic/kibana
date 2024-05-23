/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { loginAsInteractiveUser } from '../helpers';
import { TEST_CASES } from '../../common/suites/create';
import { AUTHENTICATION } from '../../common/lib/authentication';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  describe('create', function () {
    let sessionHeaders: { [key: string]: string } = {};

    before(async () => {
      sessionHeaders = await loginAsInteractiveUser({
        getService,
        ...AUTHENTICATION.KIBANA_RBAC_USER,
      });
    });

    it('created_by/updated_by is with profile_id', async () => {
      const soType = TEST_CASES.NEW_SINGLE_NAMESPACE_OBJ.type;
      const createResponse = await supertest
        .post(`/api/saved_objects/${soType}`)
        .set(sessionHeaders)
        .send({ attributes: { title: 'test' } });

      expect(createResponse.status).to.be(200);
      const so = createResponse.body;
      expect(typeof so.created_by).to.be('string');
      expect(typeof so.updated_by).to.be('string');
      expect(so.created_by).to.be(so.updated_by);
    });
  });
}

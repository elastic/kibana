/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RoleCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalHeaders: InternalRequestHeader;

  describe('GET /api/console/api_server', () => {
    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalHeaders = samlAuth.getInternalRequestHeader();
    });
    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    it('returns autocomplete definitions', async () => {
      const { body } = await supertestWithoutAuth
        .get('/api/console/api_server')
        .set(roleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .set('kbn-xsrf', 'true')
        .expect(200);
      expect(body.es).to.be.ok();
      const {
        es: { name, globals, endpoints },
      } = body;
      expect(name).to.be.ok();
      expect(Object.keys(globals).length).to.be.above(0);
      expect(Object.keys(endpoints).length).to.be.above(0);
    });
  });
}

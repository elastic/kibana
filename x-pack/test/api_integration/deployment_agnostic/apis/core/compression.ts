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

  describe('compression', () => {
    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalHeaders = samlAuth.getInternalRequestHeader();
    });
    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('against an application page', () => {
      it(`uses compression when there isn't a referer`, async () => {
        const response = await supertestWithoutAuth
          .get('/app/kibana')
          .set('accept-encoding', 'gzip')
          .set(internalHeaders)
          .set(roleAuthc.apiKeyHeader);
        expect(response.header).to.have.property('content-encoding', 'gzip');
      });

      it(`uses compression when there is a whitelisted referer`, async () => {
        const response = await supertestWithoutAuth
          .get('/app/kibana')
          .set('accept-encoding', 'gzip')
          .set(internalHeaders)
          .set('referer', 'https://some-host.com')
          .set(roleAuthc.apiKeyHeader);
        expect(response.header).to.have.property('content-encoding', 'gzip');
      });
    });
  });
}

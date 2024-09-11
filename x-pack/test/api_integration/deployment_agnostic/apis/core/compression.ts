/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestWithAdminScope: SupertestWithRoleScopeType;

  describe('compression', () => {
    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withCustomHeaders: { 'accept-encoding': 'gzip' },
      });
    });
    after(async () => {
      await supertestWithAdminScope.destroy();
    });
    describe('against an application page', () => {
      it(`uses compression when there isn't a referer`, async () => {
        const response = await supertestWithAdminScope.get('/app/kibana');
        expect(response.header).to.have.property('content-encoding', 'gzip');
      });

      it(`uses compression when there is a whitelisted referer`, async () => {
        const response = await supertestWithAdminScope
          .get('/app/kibana')
          .set('referer', 'https://some-host.com');
        expect(response.header).to.have.property('content-encoding', 'gzip');
      });
    });
  });
}

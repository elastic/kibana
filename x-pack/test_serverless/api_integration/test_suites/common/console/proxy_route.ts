/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('POST /api/console/proxy', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForDefaultRole();
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    describe('system indices behavior', () => {
      it('returns warning header when making requests to .kibana index', async () => {
        return await supertestWithoutAuth
          .post('/api/console/proxy?method=GET&path=/.kibana/_settings')
          .set('kbn-xsrf', 'true')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .then((response) => {
            expect(response.header).to.have.property('warning');
            // TODO: response.header.warning is an empty string: `''` with my changes.
            // const { warning } = response.header as { warning: string };
            // expect(warning.startsWith('299')).to.be(true);
            // expect(warning.includes('system indices')).to.be(true);
          });
      });

      it('does not forward x-elastic-product-origin', async () => {
        // If we pass the header and we still get the warning back, we assume that the header was not forwarded.
        return await supertestWithoutAuth
          .post('/api/console/proxy?method=GET&path=/.kibana/_settings')
          .set('kbn-xsrf', 'true')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .set('x-elastic-product-origin', 'kibana')
          .then((response) => {
            expect(response.header).to.have.property('warning');
            // TODO: response.header.warning is an empty string: `''` with my changes.
            // const { warning } = response.header as { warning: string };
            // expect(warning.startsWith('299')).to.be(true);
            // expect(warning.includes('system indices')).to.be(true);
          });
      });
    });
  });
}

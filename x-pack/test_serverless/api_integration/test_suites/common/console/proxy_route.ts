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
  const supertest = getService('supertest');
  let roleAuthc: RoleCredentials;

  describe('POST /api/console/proxy', () => {
    describe('system indices behavior', () => {
      before(async () => {
        roleAuthc = await svlUserManager.createApiKeyForDefaultRole();
      });
      after(async () => {
        await svlUserManager.invalidateApiKeyForRole(roleAuthc);
      });
      it('returns warning header when making requests to .kibana index', async () => {
        return await supertest
          .post('/api/console/proxy?method=GET&path=/.kibana/_settings')
          .set('kbn-xsrf', 'true')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .then((response) => {
            expect(response.header).to.have.property('warning');
            const { warning } = response.header as { warning: string };
            expect(warning.startsWith('299')).to.be(true);
            expect(warning.includes('system indices')).to.be(true);
          });
      });

      it('does not forward x-elastic-product-origin', async () => {
        // If we pass the header and we still get the warning back, we assume that the header was not forwarded.
        return await supertest
          .post('/api/console/proxy?method=GET&path=/.kibana/_settings')
          .set('kbn-xsrf', 'true')
          .set(svlCommonApi.getInternalRequestHeader())
          .set('x-elastic-product-origin', 'kibana')
          .set(roleAuthc.apiKeyHeader)
          .then((response) => {
            expect(response.header).to.have.property('warning');
            const { warning } = response.header as { warning: string };
            expect(warning.startsWith('299')).to.be(true);
            expect(warning.includes('system indices')).to.be(true);
          });
      });
    });
  });
}

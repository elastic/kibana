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
  const log = getService('log');
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
          .then(assertOn('returns warning header when making requests to .kibana index'));
      });

      it('does not forward x-elastic-product-origin', async () => {
        // If we pass the header and we still get the warning back, we assume that the header was not forwarded.
        return await supertestWithoutAuth
          .post('/api/console/proxy?method=GET&path=/.kibana/_settings')
          .set('kbn-xsrf', 'true')
          .set(svlCommonApi.getInternalRequestHeader())
          .set('x-elastic-product-origin', 'kibana')
          .set(roleAuthc.apiKeyHeader)
          .then(assertOn('does not forward x-elastic-product-origin'));
      });

      function assertOn(
        testName:
          | 'returns warning header when making requests to .kibana index'
          | 'does not forward x-elastic-product-origin'
      ) {
        return function assertOnResponse(response: any) {
          log.debug(`Running assertions on ${testName}`);
          expect(response.header).to.have.property('warning');
          const { warning } = response.header as { warning: string };
          expect(warning.startsWith('299')).to.eql(
            true,
            `Expect warning.startsWith('299'), but got: [${warning}]`
          );
          expect(warning.includes('system indices')).to.eql(
            true,
            `Expect warning.includes('system indices'), but got: [${warning}]`
          );
        };
      }
    });
  });
}

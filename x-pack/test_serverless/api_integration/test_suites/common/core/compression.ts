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
  let roleAuthc: RoleCredentials;
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const compressionSuite = (url: string) => {
    it(`uses compression when there isn't a referer`, async () => {
      await supertestWithoutAuth
        .get(url)
        .set('accept-encoding', 'gzip')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .then((response) => {
          expect(response.header).to.have.property('content-encoding', 'gzip');
        });
    });

    it(`uses compression when there is a whitelisted referer`, async () => {
      await supertestWithoutAuth
        .get(url)
        .set('accept-encoding', 'gzip')
        .set(svlCommonApi.getInternalRequestHeader())
        .set('referer', 'https://some-host.com')
        .set(roleAuthc.apiKeyHeader)
        .then((response) => {
          expect(response.header).to.have.property('content-encoding', 'gzip');
        });
    });
  };

  describe('compression', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('against an application page', () => {
      compressionSuite('/app/kibana');
    });
  });
}

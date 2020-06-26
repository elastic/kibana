/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { getSupertestWithoutAuth } from '../fleet/agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getSupertestWithoutAuth(providerContext);
  const authKey = 'OFpuVDdISUJ3TEZ2a1VFUFFhVDM6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==';

  describe('artifact download', () => {
    before(() => esArchiver.load('security_solution/exceptions/api_feature/exception_list'));
    after(() => esArchiver.unload('security_solution/exceptions/api_feature/exception_list'));

    it('should fail to find artifact with invalid hash', async () => {
      const { body } = await supertestWithoutAuth
        .get('/api/endpoint/allowlist/download/endpoint-allowlist-windows-1.0.0/abcd')
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey ${authKey}`)
        .send()
        .expect(404);
    });

    it('should download an artifact with correct hash', async () => {
      const { body } = await supertestWithoutAuth
        .get(
          '/api/endpoint/allowlist/download/endpoint-allowlist-windows-1.0.0/1825fb19fcc6dc391cae0bc4a2e96dd7f728a0c3ae9e1469251ada67f9e1b975'
        )
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey ${authKey}`)
        .send()
        .expect(200);
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { getSupertestWithoutAuth, setupIngest } from '../fleet/agents/services';

const exceptionListBody = {
  list_id: 'endpoint_list',
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  tags: ['user added string for a tag', 'malware'],
  type: 'endpoint',
  description: 'This is a sample agnostic endpoint type exception',
  name: 'Sample Endpoint Exception List',
  namespace_type: 'agnostic',
};

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getSupertestWithoutAuth(providerContext);
  let agentAccessAPIKey: string;

  describe('artifact download', () => {
    setupIngest(providerContext);
    before(async () => {
      await esArchiver.load('security_solution/exceptions/api_feature/exception_list');
      const { body: enrollmentApiKeysResponse } = await supertest
        .get(`/api/ingest_manager/fleet/enrollment-api-keys`)
        .expect(200);

      expect(enrollmentApiKeysResponse.list).length(1);
      const { body: enrollmentApiKeyResponse } = await supertest
        .get(
          `/api/ingest_manager/fleet/enrollment-api-keys/${enrollmentApiKeysResponse.list[0].id}`
        )
        .expect(200);

      expect(enrollmentApiKeyResponse.item).to.have.key('api_key');
      const enrollmentAPIToken = enrollmentApiKeyResponse.item.api_key;
      // 2. Enroll agent
      const { body: enrollmentResponse } = await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `ApiKey ${enrollmentAPIToken}`)
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {},
            user_provided: {},
          },
        })
        .expect(200);
      expect(enrollmentResponse.success).to.eql(true);
      agentAccessAPIKey = enrollmentResponse.item.access_api_key;
    });
    after(() => esArchiver.unload('security_solution/exceptions/api_feature/exception_list'));

    it('should fail to find artifact with invalid hash', async () => {
      const { body } = await supertestWithoutAuth
        .get('/api/endpoint/allowlist/download/endpoint-allowlist-windows-1.0.0/abcd')
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey ${agentAccessAPIKey}`)
        .send()
        .expect(404);
    });

    it('should download an artifact with correct hash', async () => {
      const { body } = await supertestWithoutAuth
        .get(
          '/api/endpoint/allowlist/download/endpoint-allowlist-macos-1.0.0/1825fb19fcc6dc391cae0bc4a2e96dd7f728a0c3ae9e1469251ada67f9e1b975'
        )
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey ${agentAccessAPIKey}`)
        .send()
        .expect(200);
    });
  });
}

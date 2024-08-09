/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('encrypted saved objects', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('route access', () => {
      describe('internal', () => {
        it('rotate key', async () => {
          let body: unknown;
          let status: number;

          ({ body, status } = await supertestWithoutAuth
            .post('/api/encrypted_saved_objects/_rotate_key')
            // .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader));
          // svlCommonApi.assertApiNotFound(body, status);
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining('Request must contain a kbn-xsrf header.'),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestWithoutAuth
            .post('/api/encrypted_saved_objects/_rotate_key')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader));
          // expect a different, legitimate error when we use the internal header
          // the config does not contain decryptionOnlyKeys, so when the API is
          // called successfully, it will error for this reason, and not for an
          // access or or missing header reason
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'Kibana is not configured to support encryption key rotation. Update `kibana.yml` to include `xpack.encryptedSavedObjects.keyRotation.decryptionOnlyKeys` to rotate your encryption keys.'
            ),
          });
          expect(status).toBe(400);
        });
      });
    });
  });
}

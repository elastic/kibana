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

  describe('translations', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    it(`returns the translations with the correct headers`, async () => {
      await supertestWithoutAuth
        .get('/translations/en.json')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .then((response) => {
          expect(response.body.locale).to.eql('en');

          expect(response.header).to.have.property(
            'content-type',
            'application/json; charset=utf-8'
          );
          expect(response.header).to.have.property(
            'cache-control',
            'public, max-age=31536000, immutable'
          );
          expect(response.header).not.to.have.property('etag');
        });
    });

    it(`returns a 404 when not using the correct locale`, async () => {
      await supertestWithoutAuth
        .get('/translations/foo.json')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .then((response) => {
          expect(response.status).to.eql(404);
        });
    });
  });
}

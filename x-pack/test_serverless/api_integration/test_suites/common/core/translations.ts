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
      roleAuthc = await svlUserManager.createApiKeyForRole('viewer');
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
          // console.dir(response.header);
          /**
           * `response.header` Looks like:
           * {
           *   'content-type': 'application/json; charset=utf-8',
           *   'cache-control': 'must-revalidate',
           *   etag: '"18cda523c38f"',
           *   'strict-transport-security': 'max-age=31536000; includeSubDomains',
           *   'x-content-type-options': 'nosniff',
           *   'referrer-policy': 'strict-origin-when-cross-origin',
           *   'permissions-policy': 'camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()',
           *   'cross-origin-opener-policy': 'same-origin',
           *   'x-frame-options': 'SAMEORIGIN',
           *   'content-security-policy': "script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; frame-ancestors 'self'",
           *   'content-security-policy-report-only': "form-action 'report-sample' 'self'",
           *   'kbn-name': 'Waynes-MacBook-Pro.local',
           *   'kbn-license-sig': '427a6af7553264697c4ddd1715e5758da34809ba708665a0bcc7c0d550c850ae',
           *   'content-length': '29',
           *   'accept-ranges': 'bytes',
           *   date: 'Mon, 06 May 2024 14:43:15 GMT',
           *   connection: 'close'
           * }
           */
          // expect(response.header).to.have.property(
          //   'cache-control',
          //   'public, max-age=31536000, immutable'
          // );
          // expect(response.header).not.to.have.property('etag');
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

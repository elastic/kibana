/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('security/authentication/http', function () {
    describe('JWT', () => {
      // When we run tests on MKI, JWT realm is configured differently, and we cannot handcraft valid JWTs.
      this.tags(['skipMKI']);

      it('allows JWT HTTP authentication only for selected routes', async () => {
        const jsonWebToken =
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2tpYmFuYS5lbGFzdGljLmNvL2p3dC8iLCJzdWIiOiJlbGFzdGljLWFnZW50IiwiYXVkIjoiZWxhc3RpY3NlYXJjaCIsIm5hbWUiOiJFbGFzdGljIEFnZW50IiwiaWF0Ijo5NDY2ODQ4MDAsImV4cCI6NDA3MDkwODgwMH0.P7RHKZlLskS5DfVRqoVO4ivoIq9rXl2-GW6hhC9NvTSkwphYivcjpTVcyENZvxTTvJJNqcyx6rF3T-7otTTIHBOZIMhZauc5dob-sqcN_mT2htqm3BpSdlJlz60TBq6diOtlNhV212gQCEJMPZj0MNj7kZRj_GsECrTaU7FU0A3HAzkbdx15vQJMKZiFbbQCVI7-X2J0bZzQKIWfMHD-VgHFwOe6nomT-jbYIXtCBDd6fNj1zTKRl-_uzjVqNK-h8YW1h6tE4xvZmXyHQ1-9yNKZIWC7iEaPkBLaBKQulLU5MvW3AtVDUhzm6--5H1J85JH5QhRrnKYRon7ZW5q1AQ';

        // Check 5 routes that are currently known to accept JWT as a means of authentication.
        for (const allowedPath of [
          '/api/status',
          '/api/stats',
          '/api/task_manager/_background_task_utilization',
          '/internal/task_manager/_background_task_utilization',
          '/api/task_manager/metrics',
        ]) {
          await supertestWithoutAuth
            .get(allowedPath)
            .set('Authorization', `Bearer ${jsonWebToken}`)
            .set('ES-Client-Authentication', 'SharedSecret my_super_secret')
            .set(svlCommonApi.getInternalRequestHeader())
            .expect(200);
        }

        // Make sure it's not possible to use JWT to have interactive sessions.
        await supertestWithoutAuth
          .get('/')
          .set('Authorization', `Bearer ${jsonWebToken}`)
          .set('ES-Client-Authentication', 'SharedSecret my_super_secret')
          .expect(401);

        // Make sure it's not possible to use JWT to access any other APIs.
        await supertestWithoutAuth
          .get('/internal/security/me')
          .set('Authorization', `Bearer ${jsonWebToken}`)
          .set('ES-Client-Authentication', 'SharedSecret my_super_secret')
          .set(svlCommonApi.getInternalRequestHeader())
          .expect(401);
      });
    });
  });
}

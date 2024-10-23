/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import cspParser from 'content-security-policy-parser';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

  describe('security/response_headers', function () {
    const baseCSP = `script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; frame-ancestors 'self'`;
    const defaultCOOP = 'same-origin';
    const defaultPermissionsPolicy =
      'camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=();report-to=violations-endpoint';
    const defaultStrictTransportSecurity = 'max-age=31536000; includeSubDomains';
    const defaultReferrerPolicy = 'strict-origin-when-cross-origin';
    const defaultXContentTypeOptions = 'nosniff';
    const defaultXFrameOptions = 'SAMEORIGIN';

    before(async () => {
      supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'viewer',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    it('API endpoint response contains default security headers', async () => {
      const { header } = await supertestViewerWithCookieCredentials
        .get(`/internal/security/me`)
        .expect(200);

      expect(header).toBeDefined();
      expectMatchesCSP(baseCSP, header['content-security-policy'] ?? '');
      expect(header['cross-origin-opener-policy']).toEqual(defaultCOOP);
      expect(header['permissions-policy']).toEqual(defaultPermissionsPolicy);
      expect(header['strict-transport-security']).toEqual(defaultStrictTransportSecurity);
      expect(header['referrer-policy']).toEqual(defaultReferrerPolicy);
      expect(header['x-content-type-options']).toEqual(defaultXContentTypeOptions);
      expect(header['x-frame-options']).toEqual(defaultXFrameOptions);
    });

    it('redirect endpoint response contains default security headers', async () => {
      const { header } = await supertestWithoutAuth
        .get(`/logout`)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(header).toBeDefined();
      expectMatchesCSP(baseCSP, header['content-security-policy'] ?? '');
      expect(header['cross-origin-opener-policy']).toEqual(defaultCOOP);
      expect(header['permissions-policy']).toEqual(defaultPermissionsPolicy);
      expect(header['strict-transport-security']).toEqual(defaultStrictTransportSecurity);
      expect(header['referrer-policy']).toEqual(defaultReferrerPolicy);
      expect(header['x-content-type-options']).toEqual(defaultXContentTypeOptions);
      expect(header['x-frame-options']).toEqual(defaultXFrameOptions);
    });
  });
}

/**
 *
 * @param expectedCSP The minimum set of directives and values we expect to see
 * @param actualCSP The actual set of directives and values
 */
function expectMatchesCSP(expectedCSP: string, actualCSP: string) {
  const expectedCSPMap = cspParser(expectedCSP);
  const actualCSPMap = cspParser(actualCSP);
  for (const [expectedDirective, expectedValues] of expectedCSPMap) {
    expect(actualCSPMap.has(expectedDirective)).toBe(true);
    for (const expectedValue of expectedValues) {
      expect(actualCSPMap.get(expectedDirective)).toContain(expectedValue);
    }
  }
}

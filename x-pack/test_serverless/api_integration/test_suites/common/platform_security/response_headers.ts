/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import cspParser from 'content-security-policy-parser';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('security/response_headers', function () {
    const baseCSP = `script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; frame-ancestors 'self'`;
    const defaultCOOP = 'same-origin';
    const defaultPermissionsPolicy =
      'camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()';
    const defaultStrictTransportSecurity = 'max-age=31536000; includeSubDomains';
    const defaultReferrerPolicy = 'strict-origin-when-cross-origin';
    const defaultXContentTypeOptions = 'nosniff';
    const defaultXFrameOptions = 'SAMEORIGIN';

    it('API endpoint response contains default security headers', async () => {
      const { header } = await supertest
        .get(`/internal/security/me`)
        .set(svlCommonApi.getInternalRequestHeader())
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
      const { header } = await supertest
        .get(`/logout`)
        .set(svlCommonApi.getInternalRequestHeader())
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

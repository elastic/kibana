/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Screenshotting diagnostic', () => {
    it('returns version information from Chromium', async () => {
      const { status, text } = await supertest
        .post(`/api/reporting/diagnose/screenshot`)
        .set('kbn-xsrf', 'reporting-diagnose');
      expect(status).to.be(200);
      const diagnostic = JSON.parse(text);

      const version =
        `"product:\\"HeadlessChrome/106.0.5249.0\\"` +
        ` rev:\\"@4fe489136201d28818c92ee6a4a28eca8625c885\\"` +
        ` userAgent:\\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/106.0.5249.0 Safari/537.36\\"` +
        ` jsVersion:\\"10.6.194\\"` +
        ` protocolVersion:\\"1.3\\""`;
      expect(diagnostic.logs).to.contain(version);
    });
  });
}

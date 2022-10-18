/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import assert from 'assert';
import { FtrProviderContext } from '../../ftr_provider_context';

interface ScreenshotResponse {
  logs: string[];
  capture: string;
  help: string[];
  success: true;
}

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  describe('browser', () => {
    const apiPath = '/api/reporting/diagnose/screenshot';
    const username = 'elastic';
    const password = process.env.TEST_KIBANA_PASS || 'changeme';

    let body: ScreenshotResponse;
    let status: number;

    before(async () => {
      const response = await supertest
        .post(apiPath)
        .auth(username, password)
        .set('kbn-xsrf', 'xxx');
      ({ body, status } = response);
    });

    it('sends captured screenshot', async () => {
      assert(body.capture);
    });

    it('sends screenshotting logs', async () => {
      const logs = body.logs.join();
      expect(logs).contain(`Creating browser page driver...`);
      expect(logs).contain(`Chromium launch args set to`);
      expect(logs).contain(`Sandbox is disabled`);
      expect(logs).contain(`Launching with viewport: width=800 height=600 scaleFactor=1`);
      expect(logs).contain(`Operating system`);
      expect(logs).contain(`Browser version`);
      expect(logs).contain(`Setting browser timezone to UTC...`);
      expect(logs).contain(`Browser page driver created`);
      expect(logs).contain(`Navigating URL with viewport size: width=800 height=600 scaleFactor:1`);
      expect(logs).contain(`evaluate WaitForElementsToBeInDOM: waitng for 2 elements, got 2`);
      expect(logs).contain(`Chromium consumed`);
      expect(logs).contain(`Closing the browser...`);
      expect(logs).contain(`Child browser process closed`);
      expect(logs).contain(`Browser closed.`);
      expect(logs).contain(`Deleting Chromium user data directory`);
      expect(body.help).eql([]);
    });

    it('sends success status', async () => {
      expect(status).to.be(200);
      expect(body.success).to.be(true);
    });
  });
}

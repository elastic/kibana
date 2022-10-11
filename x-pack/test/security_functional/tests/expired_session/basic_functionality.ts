/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const deployment = getService('deployment');
  const PageObjects = getPageObjects(['security', 'common']);

  describe('Basic functionality', function () {
    this.tags('includeFirefox');

    before(async () => {
      await PageObjects.security.forceLogout();
    });

    beforeEach(async () => {
      await browser.get(`${deployment.getHostPort()}/login`);
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    });

    afterEach(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
    });

    it('should attach msg=SESSION_EXPIRED to the redirect URL when redirecting to /login if the session has expired when trying to access a page', async () => {
      await PageObjects.security.loginSelector.login('basic', 'basic1');

      // Kibana will log the user out automatically 5 seconds before the `xpack.security.session.idleTimeout` timeout.
      // To simulate what will happen if this doesn't happen, navigate to a non-Kibana URL to ensure Kibana isn't running in the browser.
      await browser.get('data:,');

      // Sessions expire based on the `xpack.security.session.idleTimeout` config and is 10s in this test
      await setTimeoutAsync(11000);

      await PageObjects.common.navigateToUrl('home', '', {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
      });

      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/login');

      expect(await PageObjects.security.loginPage.getInfoMessage()).to.be(
        'Your session has timed out. Please log in again.'
      );
    });
  });
}

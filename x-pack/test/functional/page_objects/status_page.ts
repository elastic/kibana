/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function StatusPagePageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const find = getService('find');
  const { common } = getPageObjects(['common']);

  class StatusPage {
    async initTests() {
      log.debug('StatusPage:initTests');
    }

    async navigateToPage() {
      return await retry.try(async () => {
        const url = common.getHostPort() + '/status';
        log.info(`StatusPage:navigateToPage(): ${url}`);
        await browser.get(url);
      });
    }

    async expectStatusPage(): Promise<void> {
      return await retry.try(async () => {
        log.debug(`expectStatusPage()`);
        await find.byCssSelector('[data-test-subj="statusPageRoot"]', 20000);
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/status`);
      });
    }
  }

  return new StatusPage();
}

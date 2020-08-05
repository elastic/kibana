/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Url from 'url';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'common']);
  const browser = getService('browser');
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('in iframe', () => {
    it('should open Kibana for logged-in user', async () => {
      const isChromeHiddenBefore = await PageObjects.common.isChromeHidden();
      expect(isChromeHiddenBefore).to.be(true);

      await PageObjects.security.login();

      const { protocol, hostname, port } = config.get('servers.kibana');

      const url = Url.format({
        protocol,
        hostname,
        port,
        pathname: 'iframe_embedded',
      });

      await browser.navigateTo(url);

      const iframe = await testSubjects.find('iframe_embedded');
      await browser.switchToFrame(iframe);

      await retry.waitFor('page rendered for a logged-in user', async () => {
        return await PageObjects.common.isChromeVisible();
      });
    });
  });
}

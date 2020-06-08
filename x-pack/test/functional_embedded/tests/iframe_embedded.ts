/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Url from 'url';
import { By, until } from 'selenium-webdriver';
import testSubjSelector from '@kbn/test-subj-selector';
import { kbnTestConfig } from '@kbn/test';

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  const WD = getService('__webdriver__');

  describe('Kibana embedded', () => {
    it('should open Kibana for logged-in user', async () => {
      await PageObjects.security.login();
      const { protocol, hostname, port } = await kbnTestConfig.getUrlParts();
      const url = Url.format({
        protocol,
        hostname,
        port,
        pathname: 'iframe_embedded',
      });

      await browser.navigateTo(url);

      const iframe = await testSubjects.find('iframe_embedded');
      WD.driver.switchTo().frame(iframe._webElement);

      const selector = By.css(testSubjSelector('kibanaChrome'));
      const minute = 60000;
      await WD.driver.wait(until.elementLocated(selector), minute);
    });
  });
}

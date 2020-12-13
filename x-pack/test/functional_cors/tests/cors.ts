/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const config = getService('config');
  const find = getService('find');

  describe('CORS', () => {
    it('Communicates to Kibana with configured CORS', async () => {
      const args: string[] = config.get('kbnTestServer.serverArgs');
      const originSetting = args.find((str) => str.includes('server.cors.origin'));
      if (!originSetting) {
        throw new Error('Cannot find "server.cors.origin" argument');
      }
      const [, value] = originSetting.split('=');
      const url = JSON.parse(value);

      await browser.navigateTo(url[0]);
      const element = await find.byCssSelector('p');
      expect(await element.getVisibleText()).to.be('content from kibana');
    });
  });
}

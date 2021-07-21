/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObject }: FtrProviderContext) {
  const retry = getService('retry');
  const appsMenu = getService('appsMenu');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const common = getPageObject('common');
  const timePicker = getPageObject('timePicker');

  describe('testing journing', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load('x-pack/test/performance/kbn_archives/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('x-pack/test/performance/kbn_archives/discover');
    });

    it('opens home page', async () => {
      await common.navigateToApp('home');
      await retry.waitFor('solutions rendered', async () => {
        return await testSubjects.exists('~homSolutionPanel');
      });
    });

    it('loads discover', async () => {
      await appsMenu.clickLink('Discover');
      await retry.waitFor('no results found notice', async () => {
        return await testSubjects.exists('~discoverNoResults');
      });
    });

    it('finds data in the correct time range', async () => {
      await timePicker.setDefaultAbsoluteRange();
      await retry.waitFor('documents to be rendered', async () => {
        return await testSubjects.exists('~docTableRow');
      });
    });
  });
}

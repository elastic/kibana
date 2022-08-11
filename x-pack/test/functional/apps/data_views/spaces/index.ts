/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'spaceSelector',
    'home',
    'header',
    'security',
    'settings',
  ]);
  const spacesService = getService('spaces');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  describe('spaces', function () {
    this.tags('skipFirefox');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    it('it can add a space', async () => {
      await spacesService.create({
        id: 'custom_space',
        name: 'custom_space',
        disabledFeatures: [],
      });

      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.createIndexPattern('log*');

      await PageObjects.settings.clickKibanaIndexPatterns();

      // click manage spaces on first entry
      // first avatar is in header, so we want the second one
      await (await testSubjects.findAll('space-avatar-default', 1000))[1].click();

      // select custom space
      await testSubjects.click('sts-space-selector-row-custom_space');
      await testSubjects.click('sts-save-button');

      // verify custom space has been added to list
      await testSubjects.existOrFail('space-avatar-custom_space');
    });
  });
}

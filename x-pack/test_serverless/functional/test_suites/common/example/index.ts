/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  describe('Login as viewer', function () {
    const svlCommonPage = getPageObject('svlCommonPage');
    const testSubjects = getService('testSubjects');

    before(async () => {
      await svlCommonPage.loginWithRole('viewer');
    });

    it('should be able to see correct profile', async () => {
      await svlCommonPage.assertProjectHeaderExists();
      await svlCommonPage.assertUserAvatarExists();
      await svlCommonPage.clickUserAvatar();
      await svlCommonPage.assertUserMenuExists();
      const actualEmail = await testSubjects.getVisibleText('contextMenuPanelTitle');
      expect(actualEmail).to.be('elastic_viewer@elastic.co');
    });
  });
}

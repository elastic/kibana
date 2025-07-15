/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function sharingFromSpace({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const spacesService = getService('spaces');
  const browser = getService('browser');
  const { dashboard, common, share, security, spaceSelector } = getPageObjects([
    'dashboard',
    'common',
    'share',
    'security',
    'spaceSelector',
  ]);

  const spaceId = 'another-space';

  describe('Dashboard Custom Space share', () => {
    before(async () => {
      await spacesService.create({
        id: spaceId,
        name: 'Another Space',
        disabledFeatures: [],
      });

      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana',
        {
          space: spaceId,
        }
      );

      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });

      await security.forceLogout();

      await security.login(undefined, undefined, {
        expectSpaceSelector: true,
      });

      await spaceSelector.clickSpaceCard(spaceId);

      await common.navigateToApp(dashboard.APP_ID, { basePath: `/s/${spaceId}` });
      await dashboard.preserveCrossAppState();
      await dashboard.loadSavedDashboard('few panels');
      await dashboard.switchToEditMode();
      await dashboard.waitForRenderComplete();
    });

    after(async () => {
      await security.forceLogout();

      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana',
        {
          space: spaceId,
        }
      );
      await spacesService.delete(spaceId);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should copy the dashboard url', async () => {
      await share.openShareModalItem('link');
      const shareUrl = await share.getSharedUrl();
      expect(shareUrl).to.contain(`/s/${spaceId}/`);
      await browser.openNewTab();
      await browser.navigateTo(shareUrl);
      await dashboard.expectOnDashboard('few panels');
      // need to make sure there aren't extra tabs or it will impact future test suites
      // close any new tabs that were opened
      const windowHandlers = await browser.getAllWindowHandles();
      if (windowHandlers.length > 1) {
        await browser.closeCurrentWindow();
        await browser.switchToWindow(windowHandlers[0]);
      }
    });
  });
}

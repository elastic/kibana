/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APP_ID } from '@kbn/maps-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'maps', 'security', 'header']);
  const listingTable = getService('listingTable');
  const appsMenu = getService('appsMenu');

  describe('spaces feature controls', () => {
    before(async () => {
      PageObjects.maps.setBasePath('/s/custom_space');
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
      PageObjects.maps.setBasePath('');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it('shows Maps navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Maps');
      });

      it(`allows a map to be created`, async () => {
        await PageObjects.common.navigateToActualUrl(APP_ID, '/map', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.maps.waitForLayersToLoad();
        await PageObjects.maps.saveMap('my test map');
      });

      it(`allows a map to be deleted`, async () => {
        await PageObjects.common.navigateToActualUrl(APP_ID, '/', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });

        // Can not use maps.deleteSavedMaps because maps.deleteSavedMaps will
        // navigate to default space if on list page check fails
        await listingTable.searchForItemWithName('my test map');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await listingTable.checkListingSelectAllCheckbox();
        await listingTable.clickDeleteSelected();
        await PageObjects.common.clickConfirmOnModal();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await listingTable.expectItemsCount('map', 0);
      });
    });

    describe('space with Maps disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['maps'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it(`returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl(APP_ID, '/', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });
        const messageText = await PageObjects.common.getJsonBodyText();
        expect(messageText).to.eql(
          JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          })
        );
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'maps', 'security']);
  const appsMenu = getService('appsMenu');

  // FLAKY: https://github.com/elastic/kibana/issues/38414
  describe.skip('spaces feature controls', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('maps/data');
      await esArchiver.load('maps/kibana');
      PageObjects.maps.setBasePath('/s/custom_space');
    });

    after(async () => {
      await esArchiver.unload('maps/kibana');
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
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).to.contain('Maps');
      });

      it(`allows a map to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('maps', '', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.maps.saveMap('my test map');
      });

      it(`allows a map to be deleted`, async () => {
        await PageObjects.common.navigateToActualUrl('maps', '', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.maps.deleteSavedMaps('my test map');
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
        await PageObjects.common.navigateToActualUrl('maps', '', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        const messageText = await PageObjects.common.getBodyText();
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

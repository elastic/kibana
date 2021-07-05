/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'timelion', 'security', 'spaceSelector']);
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');

  describe('timelion', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        // await esArchiver.load('x-pack/test/functional/es_archives/timelion/feature_controls');
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/timelion/feature_controls.json'
        );

        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });

        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/timelion/timelion_custom_space.json',
          { space: 'custom_space' }
        );
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/timelion/feature_controls.json'
        );
      });

      it('shows timelion navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });

        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Timelion');
      });

      it(`allows a timelion sheet to be created`, async () => {
        await PageObjects.common.navigateToApp('timelion', {
          basePath: '/s/custom_space',
        });

        await PageObjects.timelion.saveTimelionSheet();
      });
    });

    describe('space with Timelion disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        // await esArchiver.load('x-pack/test/functional/es_archives/timelion/feature_controls');

        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/timelion/feature_controls.json'
        );

        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['timelion'],
        });

        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/timelion/timelion_custom_space.json',
          { space: 'custom_space' }
        );
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/timelion/feature_controls.json'
        );
      });

      it(`doesn't show timelion navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Timelion');
      });

      it(`create new timelion returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('timelion', 'i-exist', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
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

      it(`edit timelion sheet which doesn't exist returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('timelion', 'i-dont-exist', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
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

      it(`edit timelion sheet which exists returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('timelion', 'i-exist', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
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

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
  const config = getService('config');
  const spacesService = getService('spaces');
  const { common, error, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'error',
    'timePicker',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');

  async function setDiscoverTimeRange() {
    await timePicker.setDefaultAbsoluteRange();
  }

  describe('spaces', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/spaces'
        );
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/custom_space',
          { space: 'custom_space' }
        );
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/custom_space',
          { space: 'custom_space' }
        );
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/spaces'
        );
      });

      it('shows discover navlink', async () => {
        await common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Discover');
      });

      it('shows save button', async () => {
        await common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('discoverSaveButton', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it('shows "visualize" field button', async () => {
        await common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await setDiscoverTimeRange();
        await unifiedFieldList.clickFieldListItem('bytes');
        await unifiedFieldList.expectFieldListItemVisualize('bytes');
      });
    });

    describe('space with Discover disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/spaces'
        );
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['discover'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/spaces'
        );
      });

      it(`doesn't show discover navlink`, async () => {
        await common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Discover');
      });

      it(`shows 404`, async () => {
        await common.navigateToUrl('discover', '', {
          basePath: '/s/custom_space',
          shouldLoginIfPrompted: false,
          ensureCurrentUrl: false,
          useActualUrl: true,
        });
        await error.expectNotFound();
      });
    });

    describe('space with Visualize disabled', () => {
      const customSpace = 'custom_space';
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await spacesService.create({
          id: customSpace,
          name: customSpace,
          disabledFeatures: ['visualize'],
        });
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/custom_space',
          { space: customSpace }
        );
      });

      after(async () => {
        await spacesService.delete(customSpace);
      });

      it('Does not show the "visualize" field button', async () => {
        await common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await setDiscoverTimeRange();
        await unifiedFieldList.clickFieldListItem('bytes');
        await unifiedFieldList.expectMissingFieldListItemVisualize('bytes');
      });
    });
  });
}

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
  const PageObjects = getPageObjects([
    'common',
    'error',
    'discover',
    'timePicker',
    'security',
    'spaceSelector',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');

  async function setDiscoverTimeRange() {
    await PageObjects.timePicker.setDefaultAbsoluteRange();
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
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Discover');
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('discoverSaveButton', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it('shows "visualize" field button', async () => {
        await PageObjects.common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await setDiscoverTimeRange();
        await PageObjects.discover.clickFieldListItem('bytes');
        await PageObjects.discover.expectFieldListItemVisualize('bytes');
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
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Discover');
      });

      it(`shows 404`, async () => {
        await PageObjects.common.navigateToUrl('discover', '', {
          basePath: '/s/custom_space',
          shouldLoginIfPrompted: false,
          ensureCurrentUrl: false,
          useActualUrl: true,
        });
        await PageObjects.error.expectNotFound();
      });
    });

    describe('space with Visualize disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('x-pack/test/functional/es_archives/spaces/disabled_features');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['visualize'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('x-pack/test/functional/es_archives/spaces/disabled_features');
      });

      it('Does not show the "visualize" field button', async () => {
        await PageObjects.common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await setDiscoverTimeRange();
        await PageObjects.discover.clickFieldListItem('bytes');
        await PageObjects.discover.expectMissingFieldListItemVisualize('bytes');
      });
    });

    describe('space with index pattern management disabled', function () {
      // unskipped because of flakiness in cloud, caused be ingest management tests
      // should be unskipped when https://github.com/elastic/kibana/issues/74353 was resolved
      this.tags(['skipCloud']);
      before(async () => {
        await spacesService.create({
          id: 'custom_space_no_index_patterns',
          name: 'custom_space_no_index_patterns',
          disabledFeatures: ['indexPatterns'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space_no_index_patterns');
      });

      it('Navigates to Kibana Analytics overview  when no data views exist', async () => {
        await PageObjects.common.navigateToUrl('discover', '', {
          basePath: '/s/custom_space_no_index_patterns',
          ensureCurrentUrl: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail('kbnOverviewAddIntegrations', {
          timeout: config.get('timeouts.waitFor'),
        });
      });
    });
  });
}

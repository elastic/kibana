/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  const toasts = getService('toasts');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'settings',
    'shareSavedObjectsToSpace',
  ]);
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');
  const queryBar = getService('queryBar');

  const savedQueryName = 'shared-saved-query';
  const destinationSpaceId = 'nondefaultspace';

  // Failing: See https://github.com/elastic/kibana/issues/173094
  describe.skip('Discover Saved Queries', () => {
    before('initialize tests', async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await spaces.create({
        id: destinationSpaceId,
        name: 'Non-default Space',
        disabledFeatures: [],
      });
    });

    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await spaces.delete(destinationSpaceId);
    });

    describe('Manage saved queries', () => {
      it('delete saved query shared in multiple spaces', async () => {
        // Navigate to Discover & create a saved query
        await PageObjects.common.navigateToApp('discover');
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.saveNewQuery(savedQueryName, '', true, false);
        await savedQueryManagementComponent.savedQueryExistOrFail(savedQueryName);
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();

        // Navigate to settings & share the saved query between multiple spaces
        await PageObjects.common.navigateToApp('settings');
        await PageObjects.settings.clickKibanaSavedObjects();
        await PageObjects.shareSavedObjectsToSpace.openShareToSpaceFlyoutForObject(savedQueryName);
        await PageObjects.shareSavedObjectsToSpace.setupForm({
          destinationSpaceId,
        });
        await PageObjects.shareSavedObjectsToSpace.saveShare();

        // Navigate back to Discover and delete the query
        await PageObjects.common.navigateToApp('discover');
        await savedQueryManagementComponent.deleteSavedQuery(savedQueryName);

        // Refresh to ensure the object is actually deleted
        await browser.refresh();
        await savedQueryManagementComponent.savedQueryMissingOrFail(savedQueryName);
      });

      it('updates a saved query', async () => {
        // Navigate to Discover & create a saved query
        await PageObjects.common.navigateToApp('discover');
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.saveNewQuery(savedQueryName, '', true, false);
        await savedQueryManagementComponent.savedQueryExistOrFail(savedQueryName);
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();

        // Navigate to Discover & create a saved query
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery('', true, false);

        // Expect to see a success toast
        const successToast = await toasts.getToastElement(1);
        const successText = await successToast.getVisibleText();
        expect(successText).to.equal(`Your query "${savedQueryName}" was saved`);

        await PageObjects.common.navigateToApp('discover');
        await savedQueryManagementComponent.deleteSavedQuery(savedQueryName);
      });
    });
  });
}

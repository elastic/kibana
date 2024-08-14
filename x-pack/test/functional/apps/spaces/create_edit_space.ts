/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { faker } from '@faker-js/faker';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const spacesServices = getService('spaces');
  const log = getService('log');

  describe('create and edit space', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('create space', () => {
      it('create a space with a given name', async () => {
        const spaceName = faker.word.adjective() + ' space';
        log.debug(`new space name: ${spaceName}`);

        await PageObjects.common.navigateToApp('spacesManagement');
        await testSubjects.existOrFail('spaces-grid-page');

        await PageObjects.spaceSelector.clickCreateSpace();
        await testSubjects.existOrFail('spaces-edit-page');

        await PageObjects.spaceSelector.addSpaceName(spaceName);
        const spaceUrlDisplay = await testSubjects.find('spaceURLDisplay');
        const spaceId = (await spaceUrlDisplay.getAttribute('value')) as string;
        expect(spaceId).not.to.be.empty();
        log.debug(`new space identifier: ${spaceId}`);
        await PageObjects.spaceSelector.clickSaveSpaceCreation();

        await testSubjects.existOrFail('spaces-grid-page');
        await testSubjects.existOrFail(`spacesListTableRow-${spaceId}`);

        await spacesServices.delete(spaceId);
      });
    });

    describe('edit space', () => {
      const spaceName = faker.word.adjective() + ' space';
      const spaceId = spaceName.replace(' ', '-');

      before(async () => {
        await spacesServices.create({
          id: spaceId,
          name: spaceName,
          disabledFeatures: [],
          color: '#AABBCC',
        });
      });

      it('allows changing space initials', async () => {
        await PageObjects.common.navigateToApp('spacesManagement');
        await testSubjects.existOrFail('spaces-grid-page');
        await testSubjects.click(`${spaceId}-hyperlink`);

        const spaceInitials = faker.string.alpha(2);

        // navigated to edit space page
        await testSubjects.existOrFail('spaces-view-page > generalPanel');
        await testSubjects.setValue('spaceLetterInitial', spaceInitials);
        await testSubjects.click('save-space-button');

        // navigated back to space grid
        await testSubjects.existOrFail('spaces-grid-page');
        await testSubjects.existOrFail(`space-avatar-${spaceId}`);
        expect(await testSubjects.getVisibleText(`space-avatar-${spaceId}`)).to.be(spaceInitials);

        await spacesServices.delete(spaceId);
      });
    });

    describe('solution view', () => {
      // FIXME: no longer a valid test?
      it.skip('does not show solution view panel', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-view-page');
        await testSubjects.existOrFail('spaces-view-page > generalPanel');
        await testSubjects.missingOrFail('spaces-view-page > navigationPanel');
      });
    });
  });
}

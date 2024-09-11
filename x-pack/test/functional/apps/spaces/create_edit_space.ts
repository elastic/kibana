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

  describe('Spaces Management: Create and Edit', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('create space', () => {
      const spaceName = `${faker.word.adjective()} space`;
      const spaceId = spaceName.replace(' ', '-');

      before(async () => {
        await PageObjects.common.navigateToApp('spacesManagement');
        await testSubjects.existOrFail('spaces-grid-page');

        await PageObjects.spaceSelector.clickCreateSpace();
        await testSubjects.existOrFail('spaces-create-page');
      });

      after(async () => {
        await spacesServices.delete(spaceId);
      });

      it('create a space with a given name', async () => {
        await PageObjects.spaceSelector.addSpaceName(spaceName);
        await PageObjects.spaceSelector.clickSaveSpaceCreation();
        await testSubjects.existOrFail(`spacesListTableRow-${spaceId}`);
      });
    });

    describe('edit space', () => {
      const spaceName = `${faker.word.adjective()} space`;
      const spaceId = spaceName.replace(' ', '-');

      before(async () => {
        log.debug(`Creating space named "${spaceName}" with ID "${spaceId}"`);

        await spacesServices.create({
          id: spaceId,
          name: spaceName,
          disabledFeatures: [],
          color: '#AABBCC',
        });

        await PageObjects.common.navigateToApp('spacesManagement');
        await testSubjects.existOrFail('spaces-grid-page');
      });

      after(async () => {
        await spacesServices.delete(spaceId);
      });

      it('allows changing space initials', async () => {
        const spaceInitials = faker.string.alpha(2);

        await testSubjects.click(`${spaceId}-hyperlink`);
        await testSubjects.existOrFail('spaces-view-page > generalPanel');

        await testSubjects.setValue('spaceLetterInitial', spaceInitials);
        await testSubjects.click('save-space-button');

        await testSubjects.existOrFail('spaces-grid-page'); // wait for grid page to reload
        await testSubjects.existOrFail(`space-avatar-${spaceId}`);
        expect(await testSubjects.getVisibleText(`space-avatar-${spaceId}`)).to.be(spaceInitials);
      });
    });

    describe('solution view', () => {
      it('does not show solution view panel', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-view-page');
        await testSubjects.existOrFail('spaces-view-page > generalPanel');
        await testSubjects.missingOrFail('spaces-view-page > navigationPanel'); // xpack.spaces.allowSolutionVisibility is not enabled, so the solution view picker should not appear
      });
    });
  });
}

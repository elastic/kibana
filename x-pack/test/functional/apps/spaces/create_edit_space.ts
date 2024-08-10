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
  const log = getService('log');

  describe('create and edit space', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('create space', () => {
      const newSpaceName = faker.word.adjective() + ' space';
      log.debug(`new space name: ${newSpaceName}`);
      const newSpaceInitials = faker.random.alpha(2);
      log.debug(`new space initials: ${newSpaceInitials}`);
      let newSpaceIdentifier: string;

      it('create a space with a given name', async () => {
        await PageObjects.common.navigateToApp('spacesManagement');
        await testSubjects.existOrFail('spaces-grid-page');

        await PageObjects.spaceSelector.clickCreateSpace();
        await testSubjects.existOrFail('spaces-edit-page');

        await PageObjects.spaceSelector.addSpaceName(newSpaceName);
        await PageObjects.spaceSelector.addSpaceInitials(newSpaceInitials);
        newSpaceIdentifier = await testSubjects.getVisibleText('spaceURLDisplay');
        expect(newSpaceIdentifier).not.to.be.empty();
        log.debug(`new space identifier: ${newSpaceIdentifier}`);
        await PageObjects.spaceSelector.clickSaveSpaceCreation();

        await testSubjects.existOrFail('spaces-grid-page');
        await testSubjects.existOrFail(`spacesListTableRow-${newSpaceIdentifier}`);
      });
    });

    describe('manage general settings', () => {
      it('lalala', async () => {
        await PageObjects.common.navigateToApp('spacesManagement');
        await testSubjects.existOrFail('spaces-grid-page');
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function spaceSelectorFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'home',
    'security',
    'spaceSelector',
  ]);
  const spacesService = getService('spaces');

  // NOTE: Those tests have been copied over from the parent folder "spaces_selection.ts"
  // We want to test that under the (upcoming) solution navigation, the spaces selector works as expected
  // Once the solution navigation becomes the default we can remove this "in_solution_navigation" folder
  // and rely only on the tests in the parent folder.
  describe('Spaces', function () {
    const testSpacesIds = ['another-space', ...Array.from('123456789', (idx) => `space-${idx}`)];
    before(async () => {
      for (const testSpaceId of testSpacesIds) {
        await spacesService.create({ id: testSpaceId, name: `${testSpaceId} name` });
      }
    });
    after(async () => {
      for (const testSpaceId of testSpacesIds) {
        await spacesService.delete(testSpaceId);
      }
    });

    describe('Space Navigation Menu', () => {
      before(async () => {
        await PageObjects.security.forceLogout();
        await PageObjects.security.login(undefined, undefined, {
          expectSpaceSelector: true,
        });
      });

      after(async () => {
        await PageObjects.security.forceLogout();
      });

      it('allows user to navigate to different spaces', async () => {
        const anotherSpaceId = 'another-space';
        const defaultSpaceId = 'default';
        const space5Id = 'space-5';

        await PageObjects.spaceSelector.clickSpaceCard(defaultSpaceId);
        await PageObjects.spaceSelector.expectHomePage(defaultSpaceId);

        // change spaces with nav menu
        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.goToSpecificSpace(space5Id);
        await PageObjects.spaceSelector.expectHomePage(space5Id);

        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.goToSpecificSpace(anotherSpaceId);
        await PageObjects.spaceSelector.expectHomePage(anotherSpaceId);

        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.goToSpecificSpace(defaultSpaceId);
        await PageObjects.spaceSelector.expectHomePage(defaultSpaceId);
      });
    });

    describe('Search spaces in popover', function () {
      const spaceId = 'default';
      before(async () => {
        await PageObjects.security.forceLogout();
        await PageObjects.security.login(undefined, undefined, {
          expectSpaceSelector: true,
        });
      });

      after(async () => {
        await PageObjects.security.forceLogout();
      });

      it('allows user to search for spaces', async () => {
        await PageObjects.spaceSelector.clickSpaceCard(spaceId);
        await PageObjects.spaceSelector.expectHomePage(spaceId);
        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.expectSearchBoxInSpacesSelector();
      });

      it('search for "ce-1 name" and find one space', async () => {
        await PageObjects.spaceSelector.setSearchBoxInSpacesSelector('ce-1 name');
        await PageObjects.spaceSelector.expectToFindThatManySpace(1);
      });

      it('search for "dog" and find NO space', async () => {
        await PageObjects.spaceSelector.setSearchBoxInSpacesSelector('dog');
        await PageObjects.spaceSelector.expectToFindThatManySpace(0);
        await PageObjects.spaceSelector.expectNoSpacesFound();
      });
    });
  });
}

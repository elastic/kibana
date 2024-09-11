/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import expect from '@kbn/expect';
import { type FtrProviderContext } from '../../ftr_provider_context';

export default function spaceDetailsViewFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'spaceSelector']);
  const spacesService = getService('spaces');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');

  const testSpacesIds = [
    'odyssey',
    // this number is chosen intentionally to not exceed the default 10 items displayed by spaces table
    ...Array.from(new Array(5)).map((_) => `space-${crypto.randomUUID()}`),
  ];

  describe('Spaces Management: List of Spaces', function () {
    before(async () => {
      for (const testSpaceId of testSpacesIds) {
        await spacesService.create({ id: testSpaceId, name: `${testSpaceId}-name` });
      }

      await PageObjects.settings.navigateTo();
      await testSubjects.existOrFail('spaces');
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToUrl('management', 'kibana/spaces', {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
        shouldUseHashForSubUrl: false,
      });

      await testSubjects.existOrFail('spaces-grid-page');
    });

    after(async () => {
      for (const testSpaceId of testSpacesIds) {
        await spacesService.delete(testSpaceId);
      }
    });

    it('should list all the spaces populated', async () => {
      const renderedSpaceRow = await find.allByCssSelector('[data-test-subj*=spacesListTableRow-]');

      expect(renderedSpaceRow.length).to.equal(testSpacesIds.length + 1);
    });

    it('does not display the space switcher button when viewing the details page for the current selected space', async () => {
      const currentSpaceTitle = (
        await PageObjects.spaceSelector.currentSelectedSpaceTitle()
      )?.toLowerCase();

      expect(currentSpaceTitle).to.equal('default');

      await testSubjects.click('default-hyperlink');
      await testSubjects.existOrFail('space-view-page-details-header');
      expect(
        (await testSubjects.getVisibleText('space-view-page-details-header'))
          .toLowerCase()
          .includes('default')
      ).to.be(true);
      await testSubjects.missingOrFail('spaces-view-page-switcher-button');
    });

    it("displays the space switcher button when viewing the details page of the space that's not the current selected one", async () => {
      const testSpaceId = testSpacesIds[Math.floor(Math.random() * testSpacesIds.length)];

      const currentSpaceTitle = (
        await PageObjects.spaceSelector.currentSelectedSpaceTitle()
      )?.toLowerCase();

      expect(currentSpaceTitle).to.equal('default');

      await testSubjects.click(`${testSpaceId}-hyperlink`);
      await testSubjects.existOrFail('space-view-page-details-header');
      expect(
        (await testSubjects.getVisibleText('space-view-page-details-header'))
          .toLowerCase()
          .includes(`${testSpaceId}-name`)
      ).to.be(true);
      await testSubjects.existOrFail('spaces-view-page-switcher-button');
    });

    it('switches to a new space using the space switcher button', async () => {
      const currentSpaceTitle = (
        await PageObjects.spaceSelector.currentSelectedSpaceTitle()
      )?.toLowerCase();

      expect(currentSpaceTitle).to.equal('default');

      const testSpaceId = testSpacesIds[Math.floor(Math.random() * testSpacesIds.length)];

      await testSubjects.click(`${testSpaceId}-hyperlink`);
      await testSubjects.click('spaces-view-page-switcher-button');

      await retry.try(async () => {
        const detailsTitle = (
          await testSubjects.getVisibleText('space-view-page-details-header')
        ).toLowerCase();

        const currentSwitchSpaceTitle = (
          await PageObjects.spaceSelector.currentSelectedSpaceTitle()
        )?.toLocaleLowerCase();

        return (
          currentSwitchSpaceTitle &&
          currentSwitchSpaceTitle === `${testSpaceId}-name` &&
          detailsTitle.includes(currentSwitchSpaceTitle)
        );
      });
    });
  });
}

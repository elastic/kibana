/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const TIMEOUT_CHECK = 3000;

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, solutionNavigation } = getPageObjects(['common', 'solutionNavigation']);
  const spaces = getService('spaces');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  describe('secondary panel toggle button', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the observability solution and navigate to its home page
      ({ cleanUp, space: spaceCreated } = await spaces.create({ solution: 'oblt' }));
      await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));

      await solutionNavigation.expectExists();
      await solutionNavigation.sidenav.expectSectionExists('observability_project_nav');
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
    });

    it('button toggles the secondary panel', async () => {
      // click "Applications" button
      const button = await testSubjects.find(`~nav-item-id-apm`, TIMEOUT_CHECK);
      await button.click();
      // expect secondary panel to be open
      expect(await solutionNavigation.sidenav.isPanelOpen('apm')).to.be(true);

      // click "Applications" button again
      await button.click();

      // expect secondary panel to be closed
      expect(await solutionNavigation.sidenav.isPanelOpen('apm')).to.be(false);
    });

    it('button text label toggles the secondary panel', async () => {
      // click text label within button
      const button = await testSubjects.find(`~nav-item-id-apm`, TIMEOUT_CHECK);
      const label = await button.findByCssSelector('span span');
      await label.click();

      // expect secondary panel to be open
      expect(await solutionNavigation.sidenav.isPanelOpen('apm')).to.be(true);

      // click text label within button again
      await label.click();

      expect(await solutionNavigation.sidenav.isPanelOpen('apm')).to.be(false);
    });

    it('button icon toggles the secondary panel', async () => {
      // click icon within button
      const button = await testSubjects.find(`~nav-item-id-apm`, TIMEOUT_CHECK);
      const icon = await button.findByCssSelector('span svg');
      await icon.click();

      // expect secondary panel to be open
      expect(await solutionNavigation.sidenav.isPanelOpen('apm')).to.be(true);

      // click icon within button again
      await icon.click();

      expect(await solutionNavigation.sidenav.isPanelOpen('apm')).to.be(false);
    });

    it('clicking outside of the secondary panel closes it', async () => {
      await solutionNavigation.sidenav.openPanel('apm', { button: 'link' });
      expect(await solutionNavigation.sidenav.isPanelOpen('apm')).to.be(true);

      await testSubjects.click(`obltOnboardingHomeTitle`, TIMEOUT_CHECK);
      expect(await solutionNavigation.sidenav.isPanelOpen('apm')).to.be(false);
    });
  });
}

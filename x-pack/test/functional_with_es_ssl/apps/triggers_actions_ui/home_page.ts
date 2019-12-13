/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const log = getService('log');
  const browser = getService('browser');

  describe('Home page', function() {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
    });

    it('Loads the app', async () => {
      await log.debug('Checking for section heading to say Triggers and Actions.');

      const headingText = await pageObjects.triggersActionsUI.getSectionHeadingText();
      expect(headingText).to.be('Alerts and actions');
    });

    describe('Connectors tab', () => {
      it('renders the connectors tab', async () => {
        // Navigate to the connectors tab
        pageObjects.triggersActionsUI.changeTabs('connectorsTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/connectors`);

        // Verify content
        await testSubjects.existOrFail('actionsList');
      });
    });

    describe('Alerts tab', () => {
      it('renders the alerts tab', async () => {
        // Navigate to the alerts tab
        pageObjects.triggersActionsUI.changeTabs('alertsTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/alerts`);

        // Verify content
        await testSubjects.existOrFail('alertsList');
      });
    });
  });
};

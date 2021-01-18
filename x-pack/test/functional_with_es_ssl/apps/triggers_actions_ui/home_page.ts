/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';
import { getTestAlertData, getTestActionData } from '../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const log = getService('log');
  const browser = getService('browser');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Home page', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('Loads the app', async () => {
      await log.debug('Checking for section heading to say Triggers and Actions.');

      const headingText = await pageObjects.triggersActionsUI.getSectionHeadingText();
      expect(headingText).to.be('Alerts and Actions');
    });

    describe('Connectors tab', () => {
      it('renders the connectors tab', async () => {
        // Navigate to the connectors tab
        await pageObjects.triggersActionsUI.changeTabs('connectorsTab');

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
        await pageObjects.triggersActionsUI.changeTabs('alertsTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/alerts`);

        // Verify content
        await testSubjects.existOrFail('alertsList');
      });

      it('navigates to an alert details page', async () => {
        const { body: createdAction } = await supertest
          .post(`/api/actions/action`)
          .set('kbn-xsrf', 'foo')
          .send(getTestActionData())
          .expect(200);
        objectRemover.add(createdAction.id, 'action', 'actions');

        const { body: createdAlert } = await supertest
          .post(`/api/alerts/alert`)
          .set('kbn-xsrf', 'foo')
          .send(getTestAlertData())
          .expect(200);
        objectRemover.add(createdAlert.id, 'alert', 'alerts');

        // refresh to see alert
        await browser.refresh();

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify content
        await testSubjects.existOrFail('alertsList');

        // click on first alert
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList(createdAlert.name);

        // Verify url
        expect(await browser.getCurrentUrl()).to.contain(`/alert/${createdAlert.id}`);
      });
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'fleet']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Home page', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('fleet');
    });

    describe('Agents', async () => {
      describe('Quick Start', async () => {
        it('Get started with fleet', async () => {
          await a11y.testAppSnapshot();
          await pageObjects.fleet.createNewFleetServer('https://localhost:8220');
        });
        it('Install Fleet Server', async () => {
          await a11y.testAppSnapshot();
        });
      });
      describe('Advanced', async () => {
        before(async () => {
          await pageObjects.fleet.clickAdvanceOption();
        });
        it('Select policy for fleet', async () => {
          await a11y.testAppSnapshot();
        });
        it('Add your fleet sever host', async () => {
          await pageObjects.fleet.addFleetServerInAdvanced();
          await a11y.testAppSnapshot();
        });
        it('Generate service token', async () => {
          await pageObjects.fleet.addGeneratedServiceToken();
          await a11y.testAppSnapshot();
        });
      });
    });
    describe('Agent policies', async () => {
      before(async () => {
        await pageObjects.fleet.clickAgentPoliciesTab();
      });
      it('Agent Policies Table', async () => {
        await a11y.testAppSnapshot();
      });
      it('Create Agent Policy Wizard', async () => {
        await testSubjects.click('createAgentPolicyButton');
        await retry.waitFor('flyout to be visible', async () => {
          return await testSubjects.isDisplayed('euiFlyoutCloseButton');
        });
        await a11y.testAppSnapshot();
        await testSubjects.click('euiFlyoutCloseButton');
        await retry.waitFor('for kql syntax bar to show up', async () => {
          return await testSubjects.isDisplayed('queryInput');
        });
      });
    });
    describe('Enrollment tokens', async () => {
      before(async () => {
        await pageObjects.fleet.clickEnrollmentTokensTab();
      });
      it('Enrollment Token Table', async () => {
        await a11y.testAppSnapshot();
      });
    });
  });
};

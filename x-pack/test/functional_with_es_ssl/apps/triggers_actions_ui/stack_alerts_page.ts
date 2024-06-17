/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomCheerio } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';

const FILTERABLE_SOLUTIONS = ['Stack management', 'Machine Learning', 'Observability', 'Security'];

const getSolutionNamesFromFilters = (quickFilters: CustomCheerio) =>
  (
    quickFilters
      .filter((_: number, f: any) => f.attribs['data-test-subj'].endsWith('rule types'))
      .toArray() as any[]
  ).map((f) =>
    f.attribs['data-test-subj'].replace('quick-filters-item-', '').replace(' rule types', '')
  );

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const log = getService('log');
  const retry = getService('retry');

  describe('Stack alerts page', function () {
    describe('Loads the page with limited privileges', () => {
      beforeEach(async () => {
        await security.testUser.restoreDefaults();
        await security.testUser.setRoles(['alerts_and_actions_role']);
      });

      it('Loads the page', async () => {
        await pageObjects.common.navigateToUrl(
          'management',
          'insightsAndAlerting/triggersActionsAlerts',
          {
            shouldUseHashForSubUrl: false,
          }
        );
        const headingText = await pageObjects.triggersActionsUI.getSectionHeadingText();
        expect(headingText).to.be('Alerts');
      });

      it('Shows only allowed feature filters', async () => {
        await pageObjects.common.navigateToUrl(
          'management',
          'insightsAndAlerting/triggersActionsAlerts',
          {
            shouldUseHashForSubUrl: false,
          }
        );

        await pageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          if (!(await testSubjects.exists('queryBarMenuPanel'))) {
            await pageObjects.triggersActionsUI.clickAlertsPageShowQueryMenuButton();
          }
          const quickFilters = await pageObjects.triggersActionsUI.getAlertsPageQuickFilters();
          const solutionFilters = getSolutionNamesFromFilters(quickFilters);
          expect(solutionFilters).to.have.length(2);
          expect(solutionFilters[0]).to.equal('Stack');
          // Observability is included because of multi-consumer rules
          expect(solutionFilters[1]).to.equal('Observability');
        });
      });
    });

    describe('Loads the page with actions but not alerting privilege', () => {
      beforeEach(async () => {
        await security.testUser.restoreDefaults();
        await security.testUser.setRoles(['only_actions_role']);
      });

      it('Loads the page but shows missing permission prompt', async () => {
        await pageObjects.common.navigateToUrl(
          'management',
          'insightsAndAlerting/triggersActionsAlerts',
          {
            shouldUseHashForSubUrl: false,
          }
        );
        const exists = await testSubjects.exists('noPermissionPrompt');
        expect(exists).to.be(true);
      });
    });

    describe('Loads the page', () => {
      beforeEach(async () => {
        await security.testUser.restoreDefaults();
        await pageObjects.common.navigateToUrl(
          'management',
          'insightsAndAlerting/triggersActionsAlerts',
          {
            shouldUseHashForSubUrl: false,
          }
        );
      });

      it('Loads the page', async () => {
        log.debug('Checking for section heading to say Alerts.');

        const headingText = await pageObjects.triggersActionsUI.getSectionHeadingText();
        expect(headingText).to.be('Alerts');
      });

      it('Shows all solution quick filters', async () => {
        await pageObjects.triggersActionsUI.clickAlertsPageShowQueryMenuButton();
        const quickFilters = await pageObjects.triggersActionsUI.getAlertsPageQuickFilters();
        const solutionFilters = getSolutionNamesFromFilters(quickFilters);
        expect(FILTERABLE_SOLUTIONS.every((s) => solutionFilters.includes(s)));
      });

      it('Applies the correct quick filter', async () => {
        await pageObjects.triggersActionsUI.clickAlertsPageShowQueryMenuButton();
        const quickFilters = await pageObjects.triggersActionsUI.getAlertsPageQuickFilters();
        const firstSolutionFilter = quickFilters
          .filter((_: number, f: any) => f.attribs['data-test-subj'].endsWith('rule types'))
          .first();
        expect(firstSolutionFilter).to.not.be(null);
        await testSubjects.click(firstSolutionFilter!.attr('data-test-subj'));
        const appliedFilters = await pageObjects.triggersActionsUI.getAlertsPageAppliedFilters();
        expect(appliedFilters).to.have.length(1);
        expect(await appliedFilters[0].getVisibleText()).to.contain(firstSolutionFilter!.text());
      });

      it('Disables all other solution filters when SIEM is applied', async () => {
        await pageObjects.triggersActionsUI.clickAlertsPageShowQueryMenuButton();
        let quickFilters = await pageObjects.triggersActionsUI.getAlertsPageQuickFilters();
        const filter = quickFilters
          .filter((_: number, f: any) =>
            f.attribs['data-test-subj'].includes('Security rule types')
          )
          .first();
        await testSubjects.click(filter!.attr('data-test-subj'));
        quickFilters = await pageObjects.triggersActionsUI.getAlertsPageQuickFilters();
        const nonSiemSolutionFilters = quickFilters.filter((_: number, f: any) => {
          const testSubj = f.attribs['data-test-subj'];
          return (
            testSubj.endsWith('rule types') &&
            !testSubj.includes('Security') &&
            !('disabled' in f.attribs)
          );
        });
        expect(nonSiemSolutionFilters).to.have.length(0);
      });

      it('Disables the SIEM solution filter when any other is applied', async () => {
        await pageObjects.triggersActionsUI.clickAlertsPageShowQueryMenuButton();
        let quickFilters = await pageObjects.triggersActionsUI.getAlertsPageQuickFilters();
        const filter = quickFilters
          .filter((_: number, f: any) => {
            const testSubj = f.attribs['data-test-subj'];
            return testSubj.includes('rule types') && !testSubj.includes('Security');
          })
          .first();
        await testSubjects.click(filter!.attr('data-test-subj'));
        quickFilters = await pageObjects.triggersActionsUI.getAlertsPageQuickFilters();
        const siemSolutionFilter = quickFilters
          .filter((_: number, f: any) =>
            f.attribs['data-test-subj'].includes('Security rule types')
          )
          .first();
        expect(siemSolutionFilter.attr('disabled')).to.not.be(null);
      });
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import type { ScoutPage, SecurityPageObjects } from '@kbn/scout-security';

const openAlertsTableForRule = async (
  page: ScoutPage,
  { alertsTablePage }: Pick<SecurityPageObjects, 'alertsTablePage'>,
  ruleName: string
): Promise<void> => {
  const quotedRuleName = ruleName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  // Endpoint Security alerts land in the same table and push this row out of
  // the virtualized grid. A rule-name filter leaves a single row.
  await page.gotoApp('security/alerts', {
    params: {
      query: `(language:kuery,query:'kibana.alert.rule.name: "${quotedRuleName}"')`,
    },
  });

  const chartsToggle = page.testSubj
    .locator('alerts-charts-panel')
    .getByTestId('query-toggle-header')
    .and(page.locator('[aria-label="Charts"]'));
  // The alerts view can still be on its loading spinner well after navigation.
  await chartsToggle.waitFor({ state: 'visible', timeout: 60_000 });
  const expandedChartsToggle = chartsToggle.and(page.locator('[aria-expanded="true"]'));
  if (await expandedChartsToggle.isVisible()) {
    await expandedChartsToggle.click();
  }
  // Collapsing the charts gives the events table a height. Until then the rule
  // cell is not in the DOM.
  await chartsToggle
    .and(page.locator('[aria-expanded="false"]'))
    .waitFor({ state: 'visible', timeout: 60_000 });
  await alertsTablePage.waitForRuleAlert(ruleName);
};

/** Open one alert's flyout, filtered to its rule, with the charts panel collapsed. */
export const openAlertFlyoutForRule = async (
  page: ScoutPage,
  pageObjects: Pick<SecurityPageObjects, 'alertsTablePage' | 'documentFlyout'>,
  ruleName: string
): Promise<void> => {
  const { alertsTablePage, documentFlyout } = pageObjects;
  await openAlertsTableForRule(page, pageObjects, ruleName);
  await alertsTablePage.expandAlertDetailsFlyout(ruleName);
  await documentFlyout.waitForAlertFlyout();
};

/** Send the rule's alert to Timeline from its alerts table row, then open its flyout there. */
export const openAlertFlyoutFromTimeline = async (
  page: ScoutPage,
  pageObjects: Pick<SecurityPageObjects, 'alertsTablePage' | 'documentFlyout' | 'timelinePage'>,
  ruleName: string
): Promise<void> => {
  const { alertsTablePage, documentFlyout, timelinePage } = pageObjects;
  await openAlertsTableForRule(page, pageObjects, ruleName);
  await alertsTablePage.alertsTable
    .getByRole('row')
    .filter({ has: page.testSubj.locator('ruleName').filter({ hasText: ruleName }) })
    .getByTestId('send-alert-to-timeline-button')
    .click();
  await timelinePage.panel.waitFor({ state: 'visible' });
  // Investigate in timeline filters on this alert's id, so Timeline has a single row.
  // Its first query can take as long as an app load.
  await page.testSubj
    .locator('timeline-container')
    .getByTestId('docTableExpandToggleColumn')
    .click({ timeout: APP_LOAD_TIMEOUT_MS });
  await documentFlyout.waitForAlertFlyout();
};

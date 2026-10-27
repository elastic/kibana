/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
// Imported from the id module (not the `actions` barrel) to keep the React action code out of the Node-side Playwright load.
import { ADD_TO_CASE_EPISODE_ACTION_ID } from '@kbn/alerting-v2-episodes-ui/actions/add_to_case_action_id';
import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { OBSERVABILITY_ALERTING_BASE_PATH } from '@kbn/deeplinks-observability';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../../../../../public/constants';

export const OBSERVABILITY_ALERTING_SURFACES = [
  { name: 'Alerts', path: OBSERVABILITY_ALERTING_ALERTS_PATH, title: 'Alerts' },
  { name: 'Rules (V1)', path: OBSERVABILITY_ALERTING_RULES_V1_PATH, title: 'Rules' },
  { name: 'Rules', path: OBSERVABILITY_ALERTING_RULES_V2_PATH, title: 'Rules' },
  { name: 'Rule library', path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH, title: 'Rule library' },
  {
    name: 'Action Policies',
    path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
    title: 'Action Policies',
  },
  {
    name: 'Execution history',
    path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
    title: 'Execution history',
  },
] as const;

export const OBSERVABILITY_ALERTING_RULES_V1_URL_RE =
  /\/app\/observability\/alerting\/rules\/classic(\/|$|\?|#)/;
export const OBSERVABILITY_ALERTING_RULES_V2_URL_RE =
  /\/app\/observability\/alerting\/rules\/universal(\/|$|\?|#)/;
export const OBSERVABILITY_ALERTING_ALERTS_EPISODE_URL_RE =
  /\/app\/observability\/alerting\/alerts\/[^/?#]+/;
export const OBSERVABILITY_ALERTING_RULE_DETAILS_URL_RE =
  /\/app\/observability\/alerting\/rules\/universal\/[^/?#]+/;
export const MANAGEMENT_ALERTING_V2_EPISODES_URL_RE = /\/app\/management\/alertingV2\/episodes/;
export const MANAGEMENT_ALERTING_V2_RULES_URL_RE = /\/app\/management\/alertingV2\/rules/;
export const MANAGEMENT_ALERTING_V2_URL_RE = /\/app\/management\/alertingV2(\/|$|\?|#)/;

/**
 * Drives the Observability Alerting mounts (`/app/observability/alerting`).
 * Does not wait for page chrome so the same `goto` works for the flag-off
 * (app-not-found) case.
 */
export class ObservabilityAlertingPage {
  public readonly pageTitle: Locator;
  public readonly appNotFoundPageContent: Locator;
  public readonly requiredPrivilegesPrompt: Locator;
  public readonly episodesListPage: Locator;
  public readonly episodesKpisAlertsPanel: Locator;
  public readonly episodesKpisAlertActionsPanel: Locator;
  public readonly episodesHistogramPanel: Locator;
  public readonly episodesHistogramChart: Locator;
  public readonly episodesHistogramError: Locator;
  public readonly episodesTableLoading: Locator;
  public readonly episodesTableToolbar: Locator;
  public readonly episodesItemCount: Locator;
  public readonly tagsFilterButton: Locator;
  public readonly tagsFilterListbox: Locator;
  public readonly tagsFilterSearch: Locator;
  public readonly v1RulesTab: Locator;
  public readonly v2RulesTab: Locator;
  public readonly inboxPage: Locator;
  public readonly expandRowButton: Locator;
  public readonly episodeFlyout: Locator;
  public readonly takeActionButton: Locator;
  public readonly viewDetailsLink: Locator;
  public readonly viewRuleDetailsLink: Locator;
  public readonly episodeDetailsPage: Locator;
  public readonly ruleDetailLayout: Locator;
  public readonly toasts: Locator;
  public readonly addToCaseRowControl: Locator;
  public readonly addToCaseRowMenuItem: Locator;
  public readonly rowActionsMenuButton: Locator;
  public readonly selectAllRowsToggle: Locator;
  public readonly bulkActionsMenuButton: Locator;
  public readonly addToCaseBulkAction: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.pageTitle = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.appNotFoundPageContent = this.page.testSubj.locator('appNotFoundPageContent');
    this.requiredPrivilegesPrompt = this.page.testSubj.locator('alertingRequiredPrivilegesPrompt');
    this.episodesListPage = this.page.testSubj.locator('alertingV2AlertsListPage');
    this.episodesKpisAlertsPanel = this.page.testSubj.locator('episodesKpisAlertsPanel');
    this.episodesKpisAlertActionsPanel = this.page.testSubj.locator(
      'episodesKpisAlertActionsPanel'
    );
    this.episodesHistogramPanel = this.page.testSubj.locator('episodesHistogramPanel');
    this.episodesHistogramChart = this.page.testSubj.locator('unifiedHistogramChart');
    this.episodesHistogramError = this.page.testSubj.locator('episodesHistogramError');
    this.episodesTableLoading = this.page.testSubj.locator('alertingV2EpisodesListTable-loading');
    this.episodesTableToolbar = this.page.testSubj.locator('unifiedDataTableToolbar');
    this.episodesItemCount = this.page.testSubj.locator('alertEpisodesItemCount');
    this.tagsFilterButton = this.page.testSubj.locator('episodesFilterBar-tags-button');
    this.tagsFilterListbox = this.page.getByRole('listbox', { name: 'Filter options' });
    this.tagsFilterSearch = this.page.getByPlaceholder('Search alert tags…');
    this.v1RulesTab = this.page.testSubj.locator('v1RulesTab');
    this.v2RulesTab = this.page.testSubj.locator('v2RulesTab');
    this.inboxPage = this.page.testSubj.locator('alertingV2AlertsListPage');
    this.expandRowButton = this.page.testSubj.locator('docTableExpandToggleColumn');
    this.episodeFlyout = this.page.testSubj.locator('alertingV2EpisodeFlyout');
    this.takeActionButton = this.page.testSubj.locator('alertingV2EpisodeFlyoutTakeActionButton');
    this.viewDetailsLink = this.page.testSubj.locator('alertingV2EpisodeTakeAction-viewDetails');
    this.viewRuleDetailsLink = this.page.testSubj.locator(
      'alertingV2EpisodeDetailsViewRuleDetailsButton'
    );
    this.episodeDetailsPage = this.page.testSubj.locator('alertingV2AlertDetailsPage');
    this.ruleDetailLayout = this.page.testSubj.locator('ruleDetailLayout');
    this.toasts = this.page.components.toast().toasts;
    this.addToCaseRowControl = this.page.testSubj.locator(
      `unifiedDataTable_rowControl_${ADD_TO_CASE_EPISODE_ACTION_ID}`
    );
    this.addToCaseRowMenuItem = this.page.testSubj.locator(
      `unifiedDataTable_rowMenu_${ADD_TO_CASE_EPISODE_ACTION_ID}`
    );
    this.rowActionsMenuButton = this.page.testSubj.locator(
      'unifiedDataTable_additionalRowControl_actionsMenu'
    );
    this.selectAllRowsToggle = this.page.testSubj.locator('selectAllDocsOnPageToggle');
    this.bulkActionsMenuButton = this.page.testSubj.locator('unifiedDataTableSelectionBtn');
    this.addToCaseBulkAction = this.page.testSubj.locator(
      `episodesBulkAction-${ADD_TO_CASE_EPISODE_ACTION_ID}`
    );
  }

  urlFor(path: string): string {
    return this.kbnUrl.get(`${OBSERVABILITY_ALERTING_BASE_PATH}${path}`);
  }

  async goto(path: string): Promise<string> {
    const requested = this.urlFor(path);
    // `gotoApp` waits for `load`, which Kibana's SPA often never reaches
    // (pending XHRs / "Loading Elastic"). `domcontentloaded` is enough for
    // both the flag-off app-not-found page and the flag-on chrome title.
    await this.page.goto(requested, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    return this.page.url();
  }

  async clickV1RulesTab(): Promise<void> {
    await this.v1RulesTab.click();
    await this.page.waitForURL(OBSERVABILITY_ALERTING_RULES_V1_URL_RE);
    await this.v1RulesTab
      .and(this.page.locator('[aria-selected="true"]'))
      .waitFor({ state: 'visible' });
  }

  async clickV2RulesTab(): Promise<void> {
    await this.v2RulesTab.click();
    await this.page.waitForURL(OBSERVABILITY_ALERTING_RULES_V2_URL_RE);
    await this.v2RulesTab
      .and(this.page.locator('[aria-selected="true"]'))
      .waitFor({ state: 'visible' });
  }

  async gotoInboxFilteredByRule(ruleId: string): Promise<void> {
    const search = new URLSearchParams({
      _a: `(alertsList:(ruleId:'${ruleId}'))`,
    });
    await this.goto(`${OBSERVABILITY_ALERTING_ALERTS_PATH}?${search.toString()}`);
    await this.inboxPage.waitFor({ state: 'visible' });
  }

  async openEpisodeFlyout(): Promise<void> {
    await this.expandRowButton.click();
    await this.episodeFlyout.waitFor({ state: 'visible' });
  }

  async openTakeActionMenu(): Promise<void> {
    await this.takeActionButton.click();
    await this.viewDetailsLink.waitFor({ state: 'visible' });
  }

  async clickViewDetails(): Promise<void> {
    await this.viewDetailsLink.click();
  }

  async gotoEpisodeDetails(episodeId: string): Promise<void> {
    await this.goto(`${OBSERVABILITY_ALERTING_ALERTS_PATH}/${encodeURIComponent(episodeId)}`);
    await this.episodeDetailsPage.waitFor({ state: 'visible' });
  }

  async clickViewRuleDetails(): Promise<void> {
    await this.viewRuleDetailsLink.click();
  }

  async openTagsFilter(): Promise<void> {
    await this.tagsFilterButton.click();
    await this.tagsFilterListbox.waitFor({ state: 'visible' });
  }

  async searchTagsFilter(query: string): Promise<void> {
    await this.tagsFilterSearch.fill(query);
  }

  episodeRows(ruleName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: ruleName });
  }

  /** Clicks the row's "Add to case" action, whether it renders inline or in the overflow menu. */
  async clickAddToCaseRowAction(ruleName: string): Promise<void> {
    const [row] = await this.episodeRows(ruleName).all();
    const inlineControl = row.locator(this.addToCaseRowControl);
    const overflowButton = row.locator(this.rowActionsMenuButton);

    // The table re-renders its row controls while the rule and alert queries settle, which detaches
    // the button mid-click; retrying the whole interaction rides that out.
    await expect(async () => {
      await expect(inlineControl.or(overflowButton)).toBeVisible({ timeout: 2_000 });
      if (await inlineControl.isVisible()) {
        await inlineControl.click({ timeout: 2_000 });
        return;
      }
      await overflowButton.click({ timeout: 2_000 });
      await this.addToCaseRowMenuItem.click({ timeout: 2_000 });
    }).toPass();
  }

  /** Selects every row on the page and waits until the selection toolbar reports the expected count. */
  async selectAllRows(expectedCount: number): Promise<void> {
    await expect(async () => {
      await this.selectAllRowsToggle.check({ timeout: 2_000 });
      await expect(this.bulkActionsMenuButton).toHaveAttribute(
        'data-selected-documents',
        String(expectedCount),
        { timeout: 2_000 }
      );
    }).toPass();
  }

  async clickAddToCaseBulkAction(): Promise<void> {
    await this.bulkActionsMenuButton.click();
    await this.addToCaseBulkAction.click();
  }

  tagFilterOption(tag: string): Locator {
    return this.page.testSubj.locator(`episodesFilterBar-tags-popover-option-${tag}`);
  }

  episodeRuleCell(ruleName: string): Locator {
    return this.page.testSubj.locator('episodeRuleCell').filter({ hasText: ruleName });
  }
}

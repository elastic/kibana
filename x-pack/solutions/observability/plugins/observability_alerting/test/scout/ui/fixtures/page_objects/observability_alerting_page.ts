/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_BASE_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../../../../../public/constants';

export const OBSERVABILITY_ALERTING_SURFACES = [
  { name: 'Inbox', path: OBSERVABILITY_ALERTING_INBOX_PATH, title: 'Alert episodes' },
  { name: 'Rules (v1)', path: OBSERVABILITY_ALERTING_RULES_V1_PATH, title: 'Rules' },
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
  /\/app\/observability\/alerting\/rules\/v1(\/|$|\?|#)/;
export const OBSERVABILITY_ALERTING_RULES_V2_URL_RE =
  /\/app\/observability\/alerting\/rules\/v2(\/|$|\?|#)/;
export const OBSERVABILITY_ALERTING_INBOX_EPISODE_URL_RE =
  /\/app\/observability\/alerting\/inbox\/[^/?#]+/;
export const OBSERVABILITY_ALERTING_RULE_DETAILS_URL_RE =
  /\/app\/observability\/alerting\/rules\/v2\/[^/?#]+/;
export const MANAGEMENT_ALERTING_V2_EPISODES_URL_RE = /\/app\/management\/alertingV2\/episodes/;
export const MANAGEMENT_ALERTING_V2_RULES_URL_RE = /\/app\/management\/alertingV2\/rules/;
export const MANAGEMENT_ALERTING_V2_URL_RE = /\/app\/management\/alertingV2\//;

/**
 * Drives the Observability Alerting mounts (`/app/observability/alerting`).
 * Does not wait for page chrome so the same `goto` works for the flag-off
 * (app-not-found) case.
 */
export class ObservabilityAlertingPage {
  public readonly pageTitle: Locator;
  public readonly appNotFoundPageContent: Locator;
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

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.pageTitle = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.appNotFoundPageContent = this.page.testSubj.locator('appNotFoundPageContent');
    this.v1RulesTab = this.page.testSubj.locator('v1RulesTab');
    this.v2RulesTab = this.page.testSubj.locator('v2RulesTab');
    this.inboxPage = this.page.testSubj.locator('alertingV2EpisodesListPage');
    this.expandRowButton = this.page.testSubj.locator('docTableExpandToggleColumn');
    this.episodeFlyout = this.page.testSubj.locator('alertingV2EpisodeFlyout');
    this.takeActionButton = this.page.testSubj.locator('alertingV2EpisodeFlyoutTakeActionButton');
    this.viewDetailsLink = this.page.testSubj.locator('alertingV2EpisodeTakeAction-viewDetails');
    this.viewRuleDetailsLink = this.page.testSubj.locator(
      'alertingV2EpisodeDetailsViewRuleDetailsButton'
    );
    this.episodeDetailsPage = this.page.testSubj.locator('alertingV2EpisodeDetailsPage');
    this.ruleDetailLayout = this.page.testSubj.locator('ruleDetailLayout');
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
      _a: `(episodesList:(ruleId:'${ruleId}'))`,
    });
    await this.goto(`${OBSERVABILITY_ALERTING_INBOX_PATH}?${search.toString()}`);
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
    await this.goto(`${OBSERVABILITY_ALERTING_INBOX_PATH}/${encodeURIComponent(episodeId)}`);
    await this.episodeDetailsPage.waitFor({ state: 'visible' });
  }

  async clickViewRuleDetails(): Promise<void> {
    await this.viewRuleDetailsLink.click();
  }
}

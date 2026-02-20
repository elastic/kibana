/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const CYPRESS_ES_ARCHIVES_BASE =
  'x-pack/solutions/security/test/security_solution_cypress/es_archives';

export const EXPLORE_ARCHIVES = {
  USERS: `${CYPRESS_ES_ARCHIVES_BASE}/users`,
  HOST_UNCOMMON_PROCESSES: `${CYPRESS_ES_ARCHIVES_BASE}/host_uncommon_processes`,
  ALL_USERS: `${CYPRESS_ES_ARCHIVES_BASE}/all_users`,
  OVERVIEW: `${CYPRESS_ES_ARCHIVES_BASE}/overview`,
  NETWORK: `${CYPRESS_ES_ARCHIVES_BASE}/network`,
  AUDITBEAT_MULTIPLE: `${CYPRESS_ES_ARCHIVES_BASE}/auditbeat_multiple`,
  RISK_SCORES_NEW: `${CYPRESS_ES_ARCHIVES_BASE}/risk_scores_new`,
} as const;

export const EXPLORE_URLS = {
  EXPLORE: '/app/security/explore',
  OVERVIEW: '/app/security/overview',
  HOSTS_ALL: '/app/security/hosts/allHosts',
  HOSTS_EVENTS: '/app/security/hosts/events',
  HOSTS_UNCOMMON: '/app/security/hosts/uncommonProcesses',
  HOSTS_ANOMALIES: '/app/security/hosts/anomalies',
  NETWORK_FLOWS: '/app/security/network/flows',
  USERS_ALL: '/app/security/users/allUsers',
  USERS_AUTHENTICATIONS: '/app/security/users/authentications',
  USERS_ANOMALIES: '/app/security/users/anomalies',
  USERS_EVENTS: '/app/security/users/events',
  CASES: '/app/security/cases',
  TIMELINES: '/app/security/timelines/default',
  ALERTS: '/app/security/alerts',
} as const;

/**
 * Page object for Security Solution Explore pages (hosts, network, users, overview, cases).
 */
export class ExplorePage {
  constructor(private readonly page: ScoutPage) {}

  async gotoHostsAll(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.HOSTS_ALL);
  }

  async gotoHostsUncommonProcesses(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.HOSTS_UNCOMMON);
  }

  async gotoHostsEvents(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.HOSTS_EVENTS);
  }

  async gotoNetworkFlows(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.NETWORK_FLOWS);
  }

  async gotoUsersAll(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.USERS_ALL);
  }

  async gotoOverview(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.OVERVIEW);
  }

  async gotoExplore(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.EXPLORE);
  }

  async gotoCases(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.CASES);
  }

  async gotoAlerts(): Promise<void> {
    await this.page.goto(EXPLORE_URLS.ALERTS);
  }

  async gotoUrl(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /** Navigate with timerange query params (relative, last 15m) */
  async gotoWithTimeRange(path: string): Promise<void> {
    const timerange =
      '?timerange=(global:(linkTo:!(timeline),timerange:(from:1547914976217,fromStr:now-15m,kind:relative,to:1579537385745,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1547914976217,fromStr:now-15m,kind:relative,to:1579537385745,toStr:now)))';
    await this.page.goto(path + timerange);
  }

  async navigateFromHeaderTo(testSubj: string): Promise<void> {
    const link = this.page.testSubj.locator(testSubj).first();
    await link.click();
  }

  async openExplorePanel(): Promise<void> {
    const btn = this.page.testSubj.locator('solutionSideNavItemButton-explore').first();
    await btn.click();
  }

  async openKibanaNavigation(): Promise<void> {
    const toggle = this.page.testSubj.locator('toggleNavButton').first();
    await toggle.click();
  }

  async navigateFromKibanaCollapsibleTo(title: string): Promise<void> {
    const navGroup = this.page.testSubj.locator('collapsibleNavGroup-securitySolution');
    const link = navGroup.getByTitle(title).first();
    await link.click();
  }

  async clickHostsLink(): Promise<void> {
    const link = this.page.testSubj.locator('solutionSideNavPanelLink-hosts').first();
    await link.click();
  }

  async clickNetworkLink(): Promise<void> {
    const link = this.page.testSubj.locator('solutionSideNavPanelLink-network').first();
    await link.click();
  }

  async clickUsersLink(): Promise<void> {
    const link = this.page.testSubj.locator('solutionSideNavPanelLink-users').first();
    await link.click();
  }

  async clickEventsTab(): Promise<void> {
    const tab = this.page.testSubj.locator('navigation-events').first();
    await tab.click();
  }

  async clickUncommonProcessesTab(): Promise<void> {
    const tab = this.page.testSubj.locator('navigation-uncommonProcesses').first();
    await tab.click();
  }

  async clickAuthenticationsTab(): Promise<void> {
    const tab = this.page.testSubj.locator('navigation-authentications').first();
    await tab.click();
  }

  async clickAnomaliesTab(): Promise<void> {
    const tab = this.page.testSubj.locator('navigation-anomalies').first();
    await tab.click();
  }

  async clickUserRiskTab(): Promise<void> {
    const tab = this.page.testSubj.locator('navigation-risk').first();
    await tab.click();
  }

  async refreshPage(): Promise<void> {
    await this.page.reload();
  }

  get headerSubtitle() {
    return this.page.testSubj.locator('header-panel-subtitle').first();
  }

  get allUsersTable() {
    return this.page.testSubj.locator('table-allUsers-loading-false');
  }

  get allHostsTable() {
    return this.page.testSubj.locator('table-allHosts-loading-false');
  }

  get authenticationsTable() {
    return this.page.testSubj.locator('table-users-authentications-loading-false');
  }

  get uncommonProcessesTable() {
    return this.page.testSubj.locator('table-uncommonProcesses-loading-false');
  }

  get tableFirstPage() {
    return this.page.testSubj.locator('pagination-button-0');
  }

  get tableSecondPage() {
    return this.page.testSubj.locator('pagination-button-1');
  }

  get processNameField() {
    return this.page.testSubj.locator('processName');
  }

  get hostNames() {
    return this.page.testSubj.locator('cellActions-renderContent-host.name');
  }

  get notFoundPage() {
    return this.page.testSubj.locator('empty-state');
  }
}

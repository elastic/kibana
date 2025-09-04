/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class SecurityNavigation {
  public dashboardsButton: Locator;
  public dashboardsLink: Locator;
  public overviewLink: Locator;
  public detectionResponseLink: Locator;
  public entityAnalyticsLink: Locator;
  public alertsLink: Locator;
  public timelinesLink: Locator;
  public exploreButton: Locator;
  public exploreLink: Locator;
  public hostsLink: Locator;
  public networkLink: Locator;
  public usersLink: Locator;
  public casesLink: Locator;

  // Page content locators
  public createDashboardButton: Locator;
  public timelinesTable: Locator;
  public casesTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.dashboardsButton = this.page.testSubj.locator('solutionSideNavItemButton-dashboards');
    this.dashboardsLink = this.page.testSubj.locator('solutionSideNavItemLink-dashboards');
    this.overviewLink = this.page.testSubj.locator('solutionSideNavPanelLink-overview');
    this.detectionResponseLink = this.page.testSubj.locator(
      'solutionSideNavPanelLink-detection_response'
    );
    this.entityAnalyticsLink = this.page.testSubj.locator(
      'solutionSideNavPanelLink-entity_analytics'
    );
    this.alertsLink = this.page.testSubj.locator('solutionSideNavItemLink-alerts');
    this.timelinesLink = this.page.testSubj.locator('solutionSideNavItemLink-timelines');
    this.exploreButton = this.page.testSubj.locator('solutionSideNavItemButton-explore');
    this.exploreLink = this.page.testSubj.locator('solutionSideNavItemLink-explore');
    this.hostsLink = this.page.testSubj.locator('solutionSideNavPanelLink-hosts');
    this.networkLink = this.page.testSubj.locator('solutionSideNavPanelLink-network');
    this.usersLink = this.page.testSubj.locator('solutionSideNavPanelLink-users');
    this.casesLink = this.page.testSubj.locator('solutionSideNavItemLink-cases');

    // Page content locators
    this.createDashboardButton = this.page.testSubj.locator('createDashboardButton');
    this.timelinesTable = this.page.testSubj.locator('timelines-table');
    this.casesTable = this.page.testSubj.locator('cases-table-add-case');
  }

  async gotoTimelines() {
    await this.page.gotoApp('security/timelines');
  }

  async clickDashboards() {
    await this.dashboardsLink.click();
  }

  async clickOverview() {
    await this.dashboardsButton.click();
    await this.overviewLink.click();
  }

  async clickDetectionResponse() {
    await this.dashboardsButton.click();
    await this.detectionResponseLink.click();
  }

  async clickEntityAnalytics() {
    await this.dashboardsButton.click();
    await this.entityAnalyticsLink.click();
  }

  async clickAlerts() {
    await this.alertsLink.click();
  }

  async clickTimelines() {
    await this.timelinesLink.click();
  }

  async clickExplore() {
    await this.exploreLink.click();
  }

  async clickHosts() {
    await this.exploreButton.click();
    await this.hostsLink.click();
  }

  async clickNetwork() {
    await this.exploreButton.click();
    await this.networkLink.click();
  }

  async clickUsers() {
    await this.exploreButton.click();
    await this.usersLink.click();
  }

  async clickCases() {
    await this.casesLink.click();
  }
}

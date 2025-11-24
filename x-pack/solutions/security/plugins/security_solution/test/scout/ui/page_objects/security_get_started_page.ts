/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout-security';

/**
 * Page Object for SecurityGetStartedPage
 *
 * Page object for the Security Get Started page in Kibana, including navigation elements and the AI Assistant button
 */
export class SecurityGetStartedPage {
  public aiAssistantButton: Locator;
  public dashboardsLink: Locator;
  public rulesLink: Locator;
  public alertsLink: Locator;
  public casesLink: Locator;
  public setUpSecurityButton: Locator;
  public automaticMigrationButton: Locator;
  public onboardingHubPage: Locator;

  constructor(private readonly page: ScoutPage) {
    // AI Assistant button in the top navigation banner
    this.aiAssistantButton = this.page.testSubj.locator('assistantNavLink');
    // Link to Dashboards section
    this.dashboardsLink = this.page.testSubj.locator('solutionSideNavItemLink-dashboards');
    // Link to Rules section
    this.rulesLink = this.page.testSubj.locator('solutionSideNavItemLink-rules-landing');
    // Link to Alerts section
    this.alertsLink = this.page.testSubj.locator('solutionSideNavItemLink-alerts');
    // Link to Cases section
    this.casesLink = this.page.testSubj.locator('solutionSideNavItemLink-cases');
    // Set up Security topic selector button
    this.setUpSecurityButton = this.page.testSubj.locator('default');
    // Automatic migration topic selector button
    this.automaticMigrationButton = this.page.testSubj.locator('siem_migrations');
    // Main onboarding hub page container
    this.onboardingHubPage = this.page.testSubj.locator('onboarding-hub-page');
  }

  // ========================================
  // Actions
  // ========================================

  /**
   * Click the AI Assistant button in the navigation banner
   */
  async clickAiAssistant() {
    await this.aiAssistantButton.click();
  }

  /**
   * Navigate to the Dashboards section
   */
  async navigateToDashboards() {
    await this.dashboardsLink.click();
  }

  /**
   * Navigate to the Rules section
   */
  async navigateToRules() {
    await this.rulesLink.click();
  }

  /**
   * Navigate to the Alerts section
   */
  async navigateToAlerts() {
    await this.alertsLink.click();
  }

  /**
   * Navigate to the Cases section
   */
  async navigateToCases() {
    await this.casesLink.click();
  }

  /**
   * Select the Set up Security topic in the topic selector
   */
  async selectSetUpSecurityTopic() {
    await this.setUpSecurityButton.click();
  }

  /**
   * Select the Automatic migration topic in the topic selector
   */
  async selectAutomaticMigrationTopic() {
    await this.automaticMigrationButton.click();
  }

  /**
   * Navigate to the Get Started page
   */
  async goto() {
    await this.page.gotoApp('security', { path: '/get_started' });
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const PAGE_URL = 'securitySolutionUI';
const ALERTS_NAV_ITEM_SELECTOR = 'solutionSideNavItemLink-alerts';
const DETECTIONS_NAV_ITEM_SELECTOR = 'solutionSideNavItemLink-alert_detections';
const DETECTIONS_NAV_ITEM_BUTTON_SELECTOR = 'solutionSideNavItemButton-alert_detections';
const ATTACKS_NAV_PANEL_ITEM_SELECTOR = 'solutionSideNavPanelLink-attacks';
const ALERTS_NAV_PANEL_ITEM_SELECTOR = 'solutionSideNavPanelLink-alerts';

export class DetectionsAttackDiscoveryPage {
  public standaloneAlertsNavItem: Locator;
  public detectionsNavItem: Locator;
  public detectionsPanelAlertsNavItem: Locator;
  public detectionsPanelAttacksNavItem: Locator;
  public detectionsNavItemButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.standaloneAlertsNavItem = this.page.testSubj.locator(ALERTS_NAV_ITEM_SELECTOR);
    this.detectionsNavItem = this.page.testSubj.locator(DETECTIONS_NAV_ITEM_SELECTOR);
    this.detectionsPanelAlertsNavItem = this.page.testSubj.locator(ALERTS_NAV_PANEL_ITEM_SELECTOR);
    this.detectionsPanelAttacksNavItem = this.page.testSubj.locator(
      ATTACKS_NAV_PANEL_ITEM_SELECTOR
    );
    this.detectionsNavItemButton = this.page.testSubj.locator(DETECTIONS_NAV_ITEM_BUTTON_SELECTOR);
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async expandDetectionsSection() {
    await this.detectionsNavItemButton.click();
  }
}

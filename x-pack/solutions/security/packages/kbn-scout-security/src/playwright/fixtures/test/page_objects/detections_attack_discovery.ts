/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage, ScoutTestConfig } from '@kbn/scout';

const PAGE_URL = 'securitySolutionUI';
const STATEFUL_ALERTS_NAV_ITEM_SELECTOR = 'solutionSideNavItemLink-alerts';
const STATEFUL_DETECTIONS_NAV_ITEM_SELECTOR = 'solutionSideNavItemLink-alert_detections';
const STATEFUL_DETECTIONS_NAV_ITEM_BUTTON_SELECTOR = 'solutionSideNavItemButton-alert_detections';
const STATEFUL_ATTACKS_NAV_PANEL_ITEM_SELECTOR = 'solutionSideNavPanelLink-attacks';
const STATEFUL_ALERTS_NAV_PANEL_ITEM_SELECTOR = 'solutionSideNavPanelLink-alerts';

const SERVERLESS_ALERTS_NAV_ITEM_DEEP_LINK_ID = 'securitySolutionUI:alerts';
const SERVERLESS_DETECTIONS_NAV_ITEM_ID = 'securityGroup:alertDetections';
const SERVERLESS_ATTACKS_NAV_PANEL_ITEM_DEEP_LINK_ID = 'securitySolutionUI:attacks';
const SERVERLESS_ALERTS_NAV_PANEL_ITEM_DEEP_LINK_ID = 'securitySolutionUI:alerts';

export class DetectionsAttackDiscoveryPage {
  public standaloneAlertsNavItem: Locator;
  public detectionsNavItem: Locator;
  public detectionsPanelAlertsNavItem: Locator;
  public detectionsPanelAttacksNavItem: Locator;
  public detectionsNavItemButton: Locator;

  constructor(private readonly page: ScoutPage, _config: ScoutTestConfig) {
    if (_config.serverless) {
      this.standaloneAlertsNavItem = this.page.testSubj.locator(
        `~nav-item-deepLinkId-${SERVERLESS_ALERTS_NAV_ITEM_DEEP_LINK_ID}`
      );
      this.detectionsNavItem = this.page.testSubj.locator(
        `~nav-item-id-${SERVERLESS_DETECTIONS_NAV_ITEM_ID}`
      );
      this.detectionsPanelAlertsNavItem = this.page.testSubj.locator(
        `~nav-item-deepLinkId-${SERVERLESS_ALERTS_NAV_PANEL_ITEM_DEEP_LINK_ID}`
      );
      this.detectionsPanelAttacksNavItem = this.page.testSubj.locator(
        `~nav-item-deepLinkId-${SERVERLESS_ATTACKS_NAV_PANEL_ITEM_DEEP_LINK_ID}`
      );
      this.detectionsNavItemButton = this.page.testSubj.locator(
        `~nav-item-id-${SERVERLESS_DETECTIONS_NAV_ITEM_ID}`
      );
      return;
    }

    this.standaloneAlertsNavItem = this.page.testSubj.locator(STATEFUL_ALERTS_NAV_ITEM_SELECTOR);
    this.detectionsNavItem = this.page.testSubj.locator(STATEFUL_DETECTIONS_NAV_ITEM_SELECTOR);
    this.detectionsPanelAlertsNavItem = this.page.testSubj.locator(
      STATEFUL_ALERTS_NAV_PANEL_ITEM_SELECTOR
    );
    this.detectionsPanelAttacksNavItem = this.page.testSubj.locator(
      STATEFUL_ATTACKS_NAV_PANEL_ITEM_SELECTOR
    );
    this.detectionsNavItemButton = this.page.testSubj.locator(
      STATEFUL_DETECTIONS_NAV_ITEM_BUTTON_SELECTOR
    );
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async expandDetectionsSection() {
    await this.detectionsNavItem.click();
  }
}

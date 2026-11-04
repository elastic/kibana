/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage, ScoutTestConfig } from '@kbn/scout-security';

/**
 * The two surfaces that expose Endpoint management areas: the side navigation and the Manage
 * landing page. Both are driven by the same link array, so a privilege that hides one hides both.
 *
 * The surfaces differ by deployment. Stateful renders the Security solution side nav, where the
 * areas sit in a flyout panel behind an "administration" item. Serverless renders project chrome,
 * where they sit behind an assets group that can itself be inside the "More" overflow popover.
 */
export class EndpointManagementNavPage {
  constructor(private readonly page: ScoutPage, private readonly config: ScoutTestConfig) {}

  private get isServerless(): boolean {
    return Boolean(this.config.serverless);
  }

  public async gotoSecurityRoot(): Promise<void> {
    await this.page.gotoApp('security');
  }

  public async gotoManageLanding(): Promise<void> {
    await this.page.gotoApp('security/manage');
  }

  /** The control that reveals the management areas. Absent entirely when none are reachable. */
  public get managementGroupToggle(): Locator {
    return this.isServerless
      ? this.page.testSubj.locator('~nav-item-id-securityGroup:assets')
      : this.page.testSubj.locator('solutionSideNavItemLink-administration');
  }

  /**
   * Reveals the management areas, tolerating an absent group. A role with no management access can
   * present either way depending on deployment, so callers assert on `managementGroupToggle`
   * directly rather than branching on what this found.
   */
  public async openManagementGroup(): Promise<void> {
    if (this.isServerless) {
      await this.expandOverflowIfPresent();
    }

    if ((await this.managementGroupToggle.count()) > 0) {
      await this.managementGroupToggle.click();
    }
  }

  public navItem(linkId: string): Locator {
    return this.isServerless
      ? this.page.testSubj.locator(`~nav-item-id-${linkId}`)
      : this.page.testSubj.locator(`solutionSideNavPanelLink-${linkId}`);
  }

  public landingCard(linkId: string): Locator {
    return this.page.testSubj.locator(`~LandingItem-${linkId}`);
  }

  /**
   * Serverless collapses lower-priority nav groups into a "More" popover depending on viewport
   * height, so an item can be present but unreachable until it is opened.
   */
  private async expandOverflowIfPresent(): Promise<void> {
    const moreButton = this.page.testSubj.locator('~nav-item-id-more');

    if ((await moreButton.count()) > 0 && (await moreButton.isVisible())) {
      await moreButton.click();
    }
  }
}

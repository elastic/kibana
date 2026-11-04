/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage, ScoutTestConfig } from '@kbn/scout-security';

/** The project-chrome group the Endpoint management areas hang off on serverless. */
const SERVERLESS_MANAGEMENT_GROUP_ID = 'securityGroup:assets';
const SERVERLESS_GROUP_SELECTOR = `[data-test-subj~="nav-item-id-${SERVERLESS_MANAGEMENT_GROUP_ID}"]`;

/**
 * The two surfaces that expose Endpoint management areas: the side navigation and the Manage
 * landing page. Both are driven by the same link array, so a privilege that hides one hides both.
 *
 * The surfaces differ by deployment. Stateful renders the Security solution side nav, where the
 * areas sit in a flyout panel behind an "administration" item. Serverless renders project chrome,
 * where they sit behind an assets group that is itself subject to the responsive "More" overflow.
 */
export class EndpointManagementNavPage {
  /**
   * The primary nav, but only once `data-overflow-measured` is set. Chrome first renders every
   * item in the primary menu and measures which ones fit a frame later, so reading placement
   * before that can catch the assets group moments before it moves into the overflow.
   */
  private readonly measuredPrimaryNav: Locator;
  private readonly moreMenuTrigger: Locator;
  private readonly morePopover: Locator;

  constructor(private readonly page: ScoutPage, private readonly config: ScoutTestConfig) {
    this.measuredPrimaryNav = this.page.testSubj
      .locator('kbnChromeNav-primaryNavigation')
      .and(this.page.locator('[data-overflow-measured="true"]'));
    this.moreMenuTrigger = this.page.testSubj.locator('kbnChromeNav-moreMenuTrigger');
    this.morePopover = this.page.testSubj.locator('side-nav-popover-More');
  }

  private get isServerless(): boolean {
    return Boolean(this.config.serverless);
  }

  public async gotoSecurityRoot(): Promise<void> {
    await this.page.gotoApp('security');
    await this.settleOverflow();
  }

  public async gotoManageLanding(): Promise<void> {
    await this.page.gotoApp('security/manage');
  }

  /**
   * The control that reveals the management areas, wherever chrome put it. Absent entirely when
   * no area is reachable, which is what the no-access expectations assert.
   */
  public get managementGroupToggle(): Locator {
    if (!this.isServerless) {
      return this.page.testSubj.locator('solutionSideNavItemLink-administration');
    }

    return this.groupToggleInPrimary.or(this.morePopover.locator(SERVERLESS_GROUP_SELECTOR));
  }

  /** Tolerates an absent group so the no-access expectations can assert on the areas themselves. */
  public async openManagementGroup(): Promise<void> {
    if ((await this.managementGroupToggle.count()) > 0) {
      await this.managementGroupToggle.click();
    }
  }

  public navItem(linkId: string): Locator {
    if (!this.isServerless) {
      return this.page.testSubj.locator(`solutionSideNavPanelLink-${linkId}`);
    }

    const selector = `[data-test-subj~="nav-item-id-${linkId}"]`;

    // Opening the group from the rail renders a side panel; opening it from the overflow renders
    // a panel nested inside the popover instead.
    return this.page.testSubj
      .locator(`~kbnChromeNav-sidePanel_${SERVERLESS_MANAGEMENT_GROUP_ID}`)
      .locator(selector)
      .or(
        this.morePopover
          .locator(`[data-test-subj="kbnChromeNav-nestedPanel-${SERVERLESS_MANAGEMENT_GROUP_ID}"]`)
          .locator(selector)
      );
  }

  public landingCard(linkId: string): Locator {
    return this.page.testSubj.locator(`~LandingItem-${linkId}`);
  }

  private get groupToggleInPrimary(): Locator {
    return this.measuredPrimaryNav.locator(SERVERLESS_GROUP_SELECTOR);
  }

  /**
   * Serverless moves lower-priority nav groups into a "More" popover depending on viewport height,
   * so the group can be present but unreachable until it is opened. Opening it up front makes
   * placement irrelevant to the expectations, including the ones asserting absence: a group left
   * in the overflow would otherwise read as absent whether the role could reach it or not.
   *
   * Left closed when the group is already in the rail, so the popover cannot end up over the
   * control the expectations are about to click.
   */
  private async settleOverflow(): Promise<void> {
    if (!this.isServerless) {
      return;
    }

    await this.measuredPrimaryNav.waitFor({ state: 'visible' });

    if (await this.groupToggleInPrimary.isVisible()) {
      return;
    }

    if (!(await this.moreMenuTrigger.isVisible())) {
      return;
    }

    await this.moreMenuTrigger.click();
    await this.morePopover.waitFor({ state: 'visible' });
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage, ScoutTestConfig, SecurityPageObjects } from '@kbn/scout-security';

/** The project-chrome group the Endpoint management areas hang off on serverless. */
const SERVERLESS_MANAGEMENT_GROUP_ID = 'securityGroup:assets';
const SERVERLESS_GROUP_SELECTOR = `[data-test-subj~="nav-item-id-${SERVERLESS_MANAGEMENT_GROUP_ID}"]`;

type ProjectChromePage = SecurityPageObjects['serverlessProjectChromePage'];

/**
 * The two surfaces that expose Endpoint management areas: the side navigation and the Manage
 * landing page. Both are driven by the same link array, so a privilege that hides one hides both.
 *
 * The surfaces differ by deployment. Stateful renders the Security solution side nav, where the
 * areas sit in a flyout panel behind an "administration" item. Serverless renders project chrome,
 * where they sit behind an assets group that is itself subject to the responsive "More" overflow.
 * The overflow itself is handled by the shared `serverlessProjectChromePage`; only the panels the
 * group opens are specific to these tests.
 */
export class EndpointManagementNavPage {
  constructor(
    private readonly page: ScoutPage,
    private readonly config: ScoutTestConfig,
    private readonly projectChrome: ProjectChromePage
  ) {}

  private get isServerless(): boolean {
    return Boolean(this.config.serverless);
  }

  public async gotoSecurityRoot(): Promise<void> {
    await this.page.gotoApp('security');
    await this.waitForNavRendered();
    await this.settleOverflow();
  }

  public async gotoManageLanding(): Promise<void> {
    await this.page.gotoApp('security/manage');
  }

  /**
   * The control that reveals the management areas, wherever chrome put it. Absent entirely when
   * no area is reachable, which is what the no-access expectations assert.
   *
   * Safe to read unmeasured: `gotoSecurityRoot` settles the overflow before any caller gets here.
   */
  public get managementGroupToggle(): Locator {
    if (!this.isServerless) {
      return this.page.testSubj.locator('solutionSideNavItemLink-administration');
    }

    return this.projectChrome.navItemInBodyById(SERVERLESS_MANAGEMENT_GROUP_ID);
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
        this.projectChrome.morePopover
          .locator(`[data-test-subj="kbnChromeNav-nestedPanel-${SERVERLESS_MANAGEMENT_GROUP_ID}"]`)
          .locator(selector)
      );
  }

  public landingCard(linkId: string): Locator {
    return this.page.testSubj.locator(`~LandingItem-${linkId}`);
  }

  private get groupToggleInPrimary(): Locator {
    return this.projectChrome.measuredPrimaryNav.locator(SERVERLESS_GROUP_SELECTOR);
  }

  /**
   * Security resolves its links asynchronously, and `gotoApp` only waits for `load`. Without a
   * positive signal that the navigation has rendered, an expectation that an area is *absent*
   * passes against a nav that simply has not populated yet.
   *
   * The signal differs by deployment because the surfaces differ: serverless cannot use a nav item
   * here, since every item these tests care about can legitimately be absent, so it settles on
   * chrome having measured the overflow instead — which it can only do once items exist. Stateful
   * keeps its "Manage" item whatever the Endpoint privileges are, because non-Endpoint management
   * areas live behind it too.
   */
  private async waitForNavRendered(): Promise<void> {
    if (this.isServerless) {
      await this.projectChrome.measuredPrimaryNav.waitFor({ state: 'visible' });
      return;
    }

    await this.page.testSubj
      .locator('solutionSideNavItemLink-administration')
      .waitFor({ state: 'visible' });
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

    // Measurement has already settled in `waitForNavRendered`, so placement reads true here.
    if (await this.groupToggleInPrimary.isVisible()) {
      return;
    }

    await this.projectChrome.openChromeNavMoreMenuIfPresent();
  }
}

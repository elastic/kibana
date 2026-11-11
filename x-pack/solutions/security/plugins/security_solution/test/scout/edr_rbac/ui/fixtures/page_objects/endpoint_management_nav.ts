/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import type { Locator, ScoutPage, ScoutTestConfig, SecurityPageObjects } from '@kbn/scout-security';

/** The project-chrome group the Endpoint management areas hang off on serverless. */
const SERVERLESS_MANAGEMENT_GROUP_ID = 'securityGroup:assets';
const SERVERLESS_GROUP_SELECTOR = `[data-test-subj~="nav-item-id-${SERVERLESS_MANAGEMENT_GROUP_ID}"]`;

/** One attempt at reading the opened panel: long enough to mount, short enough to retry early. */
const PANEL_READ_TIMEOUT_MS = 2_000;
/** Budget for the whole reveal. A rebuild costs one attempt, so a handful of them always fit. */
const REVEAL_TIMEOUT_MS = 20_000;

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
   * Reveals the management areas and returns only once they are readable, for the expectations
   * that require at least one area to be reachable.
   *
   * Chrome rebuilds the primary menu every time the application republishes its navigation items:
   * `useResponsiveMenu` drops the measured overflow split, returns every item to the primary menu
   * and re-measures a frame later, which unmounts the open "More" popover and the group's panel
   * with it. `data-overflow-measured` cannot rule that out — it reports the item set present at
   * that instant, and Security keeps resolving links past the app having mounted, since
   * `registerPluginUpdates` is deliberately not awaited and `getFilteredLinks` waits on HTTP. So
   * the open state is re-established until a read of the panel survives it, instead of being
   * established once up front. Re-entering is a no-op while the popover and panel are open.
   */
  public async revealManagementAreas(): Promise<void> {
    if (!this.isServerless) {
      await this.managementGroupToggle.click();
      return;
    }

    await expect(async () => {
      await this.settleOverflow();

      if (!(await this.managementAreasPanel.isVisible())) {
        await this.managementGroupToggle.click();
      }

      await expect(this.managementAreasPanel).toBeVisible({ timeout: PANEL_READ_TIMEOUT_MS });
    }).toPass({ timeout: REVEAL_TIMEOUT_MS });
  }

  /** Tolerates an absent group so the no-access expectations can assert on the areas themselves. */
  public async openManagementGroupIfPresent(): Promise<void> {
    if ((await this.managementGroupToggle.count()) > 0) {
      await this.managementGroupToggle.click();
    }
  }

  public navItem(linkId: string): Locator {
    if (!this.isServerless) {
      return this.page.testSubj.locator(`solutionSideNavPanelLink-${linkId}`);
    }

    const selector = `[data-test-subj~="nav-item-id-${linkId}"]`;

    return this.groupSidePanel.locator(selector).or(this.groupNestedPanel.locator(selector));
  }

  public landingCard(linkId: string): Locator {
    return this.page.testSubj.locator(`~LandingItem-${linkId}`);
  }

  /**
   * The control that reveals the management areas, wherever chrome put it. Absent entirely when
   * no area is reachable, which is what the no-access expectations assert.
   */
  private get managementGroupToggle(): Locator {
    if (!this.isServerless) {
      return this.page.testSubj.locator('solutionSideNavItemLink-administration');
    }

    return this.projectChrome.navItemInBodyById(SERVERLESS_MANAGEMENT_GROUP_ID);
  }

  /** Opening the group from the rail renders a side panel. */
  private get groupSidePanel(): Locator {
    return this.page.testSubj.locator(`~kbnChromeNav-sidePanel_${SERVERLESS_MANAGEMENT_GROUP_ID}`);
  }

  /** Opening it from the overflow renders a panel nested inside the popover instead. */
  private get groupNestedPanel(): Locator {
    return this.projectChrome.morePopover.locator(
      `[data-test-subj="kbnChromeNav-nestedPanel-${SERVERLESS_MANAGEMENT_GROUP_ID}"]`
    );
  }

  /** The open panel of management areas, wherever chrome rendered it. */
  private get managementAreasPanel(): Locator {
    return this.groupSidePanel.or(this.groupNestedPanel);
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

    // Scoped to the measured nav, so an unmeasured item set reads as "not in the rail" and the
    // overflow is opened — which waits for measurement — rather than trusting a placement in flux.
    if (await this.groupToggleInPrimary.isVisible()) {
      return;
    }

    await this.projectChrome.openChromeNavMoreMenuIfPresent();
  }
}

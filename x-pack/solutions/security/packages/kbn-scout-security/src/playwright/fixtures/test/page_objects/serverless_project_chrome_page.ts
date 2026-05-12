/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Serverless / project chrome (Security home): primary nav, More overflow, Agent Builder deep link.
 * Stack Management routes often omit full project nav — navigate via `securitySolutionUI` first.
 *
 * Locator shape mirrors {@link ObservabilityNavigation} in `@kbn/scout-oblt` for consistency.
 */
export class ServerlessProjectChromePage {
  public readonly primaryNav: Locator;
  public readonly morePopover: Locator;
  public readonly moreMenuTrigger: Locator;

  constructor(private readonly page: ScoutPage) {
    this.primaryNav = this.page.testSubj.locator('kbnChromeNav-primaryNavigation');
    this.morePopover = this.page.testSubj.locator('side-nav-popover-More');
    this.moreMenuTrigger = this.page.testSubj.locator('kbnChromeNav-moreMenuTrigger');
  }

  async navigateToSecuritySolutionHomeForChromeNav() {
    await this.page.gotoApp('securitySolutionUI');
    await this.primaryNav.waitFor({
      state: 'visible',
      // securitySolutionUI loads the full SIEM shell; first project chrome render can exceed the default action timeout in CI.
      timeout: 35_000,
    });
  }

  /** Primary strip or "More" popover — for overflow-dependent placement (same as ObservabilityNavigation.navItemInBodyById). */
  navItemInBodyById(id: string): Locator {
    const selector = `[data-test-subj~="nav-item-id-${id}"]`;
    return this.primaryNav.locator(selector).or(this.morePopover.locator(selector));
  }

  /** Agent Builder nav item when present (deep link id `agent_builder`). */
  getAgentBuilderNavItemInProjectChrome(): Locator {
    return this.navItemInBodyById('agent_builder');
  }

  private async openMoreMenuIfTriggerVisible(): Promise<void> {
    if ((await this.moreMenuTrigger.count()) === 0 || !(await this.moreMenuTrigger.isVisible())) {
      return;
    }
    await this.moreMenuTrigger.click();
    await this.morePopover.waitFor({
      state: 'visible',
      // Popover mount and layout after trigger click; bound so we fail fast under the suite timeout while tolerating CI variance.
      timeout: 10_000,
    });
  }

  async openChromeNavMoreMenuIfAgentBuilderLinkNotVisible(): Promise<void> {
    if (await this.getAgentBuilderNavItemInProjectChrome().isVisible()) {
      return;
    }
    await this.openMoreMenuIfTriggerVisible();
  }

  async openChromeNavMoreMenuIfPresent(): Promise<void> {
    await this.openMoreMenuIfTriggerVisible();
  }
}

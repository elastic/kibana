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
  public readonly breadcrumbs: Locator;
  public readonly logo: Locator;

  constructor(private readonly page: ScoutPage) {
    this.primaryNav = this.page.testSubj.locator('kbnChromeNav-primaryNavigation');
    this.morePopover = this.page.testSubj.locator('side-nav-popover-More');
    this.moreMenuTrigger = this.page.testSubj.locator('kbnChromeNav-moreMenuTrigger');
    this.breadcrumbs = this.page.testSubj.locator('breadcrumbs');
    this.logo = this.page.testSubj.locator('nav-header-logo');
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

  /** Primary strip or "More" popover — for overflow-dependent placement (same as ObservabilityNavigation.navItemInBodyByDeepLinkId). */
  navItemInBodyByDeepLinkId(deepLinkId: string): Locator {
    const selector = `[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`;
    return this.primaryNav.locator(selector).or(this.morePopover.locator(selector));
  }

  /** Item with `nav-item-isActive` in test-subj (current route) — primary strip or "More" popover. */
  activeNavItemInBodyByDeepLinkId(deepLinkId: string): Locator {
    const selector = `[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"][data-test-subj~="nav-item-isActive"]`;
    return this.primaryNav.locator(selector).or(this.morePopover.locator(selector));
  }

  /** Breadcrumb matching visible text. */
  getBreadcrumbByText(text: string): Locator {
    return this.breadcrumbs.locator('.euiBreadcrumb', { hasText: text });
  }

  async clickLogo() {
    await this.logo.click();
  }

  async openNavSearch() {
    await this.page.testSubj.click('nav-search-reveal');
  }

  async searchNav(term: string) {
    await this.page.testSubj.fill('nav-search-input', term);
  }

  /** Search-result option whose EUI `url` prop matches `url` exactly. */
  getNavSearchOptionByUrl(url: string): Locator {
    return this.page.locator(`[data-test-subj="nav-search-option"][url="${url}"]`);
  }

  async closeNavSearch() {
    await this.page.testSubj.click('nav-search-conceal');
  }

  /** Agent Builder nav item when present (deep link id `agent_builder`). */
  getAgentBuilderNavItemInProjectChrome(): Locator {
    return this.navItemInBodyById('agent_builder');
  }

  /** AI Value Report nav item when present (deep link id `ai_value`). */
  getAiValueReportNavItemInProjectChrome(): Locator {
    return this.navItemInBodyById('ai_value');
  }

  private async openMoreMenuIfTriggerVisible(): Promise<void> {
    if ((await this.moreMenuTrigger.count()) === 0 || !(await this.moreMenuTrigger.isVisible())) {
      return;
    }
    // Already open: re-clicking would hit the popover's full-viewport click-to-close
    // mask (rendered over the trigger while open) instead of the trigger itself, timing out.
    if ((await this.moreMenuTrigger.getAttribute('aria-expanded')) === 'true') {
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

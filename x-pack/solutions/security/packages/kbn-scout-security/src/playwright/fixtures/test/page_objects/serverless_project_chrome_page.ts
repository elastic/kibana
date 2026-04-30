/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Serverless / project chrome (Security home): primary nav, More overflow, Agent Builder deep link.
 * Stack Management routes often omit full project nav — navigate via `securitySolutionUI` first.
 */
export class ServerlessProjectChromePage {
  constructor(private readonly page: ScoutPage) {}

  async navigateToSecuritySolutionHomeForChromeNav() {
    await this.page.gotoApp('securitySolutionUI');
    await this.page.testSubj.locator('kbnChromeNav-primaryNavigation').waitFor({
      state: 'visible',
      timeout: 35_000,
    });
  }

  /**
   * Agent Builder item in primary row or "More" popover (same idea as ObservabilityNavigation.navItemInBodyById).
   */
  getAgentBuilderNavItemInProjectChrome() {
    const primary = this.page.testSubj.locator('kbnChromeNav-primaryNavigation');
    const morePopover = this.page.testSubj.locator('side-nav-popover-More');
    return primary
      .locator('[data-test-subj~="nav-item-id-agent_builder"]')
      .or(morePopover.locator('[data-test-subj~="nav-item-id-agent_builder"]'));
  }

  getMoreMenuTrigger() {
    return this.page.testSubj.locator('kbnChromeNav-moreMenuTrigger');
  }

  async openChromeNavMoreMenuIfAgentBuilderLinkNotVisible(): Promise<void> {
    const agentLink = this.getAgentBuilderNavItemInProjectChrome();
    if (await agentLink.isVisible()) {
      return;
    }
    const more = this.getMoreMenuTrigger();
    if ((await more.count()) === 0 || !(await more.isVisible())) {
      return;
    }
    await more.click();
    await this.page.testSubj.locator('side-nav-popover-More').waitFor({
      state: 'visible',
      timeout: 10_000,
    });
  }

  async openChromeNavMoreMenuIfPresent(): Promise<void> {
    const more = this.getMoreMenuTrigger();
    if ((await more.count()) === 0 || !(await more.isVisible())) {
      return;
    }
    await more.click();
    await this.page.testSubj.locator('side-nav-popover-More').waitFor({
      state: 'visible',
      timeout: 10_000,
    });
  }
}

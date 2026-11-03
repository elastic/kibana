/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { APP_LOAD_TIMEOUT_MS } from '../../../../../../constants/timeouts';

/**
 * Response section and details inside the flyout v2 document overview.
 * ExpandableSection renders the header and content test ids, not the section id.
 */
export class ResponseTool {
  /** Accordion header for the Response section. The section is collapsed by default. */
  public readonly responseSectionHeader: Locator;
  /** Button inside the expanded section that opens Response details. */
  public readonly responseButton: Locator;
  /** Response details panel, including the isolate result comment. */
  public readonly responseDetails: Locator;

  constructor(page: ScoutPage) {
    this.responseSectionHeader = page.testSubj.locator(
      'securitySolutionFlyoutResponseSectionHeader'
    );
    this.responseButton = page.testSubj.locator('securitySolutionFlyoutResponseButton');
    this.responseDetails = page.testSubj.locator('securitySolutionFlyoutResponseDetails');
  }

  async openResponseDetails(): Promise<void> {
    await this.responseSectionHeader.waitFor({
      state: 'visible',
      timeout: APP_LOAD_TIMEOUT_MS,
    });
    await this.responseSectionHeader.scrollIntoViewIfNeeded({ timeout: APP_LOAD_TIMEOUT_MS });
    if (!(await this.responseButton.isVisible())) {
      await this.responseSectionHeader.click({ timeout: APP_LOAD_TIMEOUT_MS });
      await this.responseButton.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
    }
    await this.responseButton.click({ timeout: APP_LOAD_TIMEOUT_MS });
    await this.responseDetails.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
  }
}

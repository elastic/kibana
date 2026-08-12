/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page object for the flyout_v2 user entity flyout, opened via `services.overlays.openSystemFlyout`
 * from a `user.name` value (e.g. the alerts table user-details cell or the document flyout entities
 * section).
 *
 * Covers the user flyout entry point.
 */
export class UserFlyout {
  /** Header container. */
  public readonly header: Locator;
  /** Title text (the user name). Scoped to the header to disambiguate from a parent document flyout. */
  public readonly title: Locator;

  constructor(page: ScoutPage) {
    this.header = page.testSubj.locator('user-panel-header');
    this.title = this.header.locator('[data-test-subj="flyoutTitleText"]');
  }

  /** Wait for the user flyout to be visible and its header rendered. */
  async waitForUserFlyout() {
    await this.header.waitFor({ state: 'visible', timeout: 15_000 });
  }
}

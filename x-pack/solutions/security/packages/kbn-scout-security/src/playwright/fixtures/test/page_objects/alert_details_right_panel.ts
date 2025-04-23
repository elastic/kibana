/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, Locator } from '@kbn/scout';

export class AlertDetailsRightPanelPage {
  public detailsFlyoutCloseIcon: Locator;
  public detailsFlyoutHeaderTitle: Locator;

  constructor(private readonly page: ScoutPage) {
    this.detailsFlyoutHeaderTitle = this.page.testSubj.locator(
      'securitySolutionFlyoutAlertTitleText'
    );
    this.detailsFlyoutCloseIcon = this.page.testSubj.locator('euiFlyoutCloseButton');
  }

  async closeFlyout() {
    await this.detailsFlyoutCloseIcon.click();
  }
}

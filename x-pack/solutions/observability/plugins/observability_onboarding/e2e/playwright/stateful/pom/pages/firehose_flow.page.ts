/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Page, type Locator } from '@playwright/test';

export class FirehoseFlowPage {
  page: Page;

  readonly cliOptionButton: Locator;
  readonly copyToClipboardButton: Locator;
  readonly waitingForDataIndicator: Locator;
  readonly awsServiceReceivedDataItemList: Locator;

  constructor(page: Page) {
    this.page = page;

    this.cliOptionButton = this.page.getByTestId('createCloudFormationOptionAWSCLI');
    this.copyToClipboardButton = this.page.getByTestId(
      'observabilityOnboardingCopyToClipboardButton'
    );
    this.waitingForDataIndicator = this.page.getByTestId(
      'observabilityOnboardingFirehoseProgressCallout'
    );
    this.awsServiceReceivedDataItemList = this.page.getByTestId(
      /^observabilityOnboardingAWSService-.+/
    );
  }
}

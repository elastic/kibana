/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * Onboarding empty state of the endpoint list, shown when no Defend policy and no host exist.
 * Actions and locators only; the spec asserts.
 */
export class EndpointListEmptyStatePage {
  readonly policyOnboardingInstructions: Locator;
  readonly onboardingStartButton: Locator;
  readonly noFleetAccess: Locator;

  constructor(private readonly page: ScoutPage) {
    this.policyOnboardingInstructions = this.page.testSubj.locator('policyOnboardingInstructions');
    this.onboardingStartButton = this.page.testSubj.locator('onboardingStartButton');
    this.noFleetAccess = this.page.testSubj.locator('noFleetAccess');
  }

  /** Opens the endpoint list and waits for the policy onboarding empty state. */
  async goto(): Promise<void> {
    await this.page.gotoApp('security/administration/endpoints', {
      readyWhen: this.policyOnboardingInstructions,
      // The empty state renders after the user privileges, the endpoint list init and the
      // Defend policy list load; on a cold first load that can take longer than the 30s default.
      readyTimeout: APP_LOAD_TIMEOUT_MS,
    });
  }
}

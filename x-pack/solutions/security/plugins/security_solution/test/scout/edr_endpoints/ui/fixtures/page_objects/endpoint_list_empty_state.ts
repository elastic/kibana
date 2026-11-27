/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * Empty states of the endpoint list when no host exists: the policy onboarding (no Defend policy,
 * or the user cannot list it) and the hosts onboarding (a Defend policy is listed).
 */
export class EndpointListEmptyStatePage {
  readonly emptyPolicyTable: Locator;
  readonly policyOnboardingInstructions: Locator;
  readonly onboardingStartButton: Locator;
  readonly noFleetAccess: Locator;
  readonly emptyHostsTable: Locator;
  readonly onboardingSteps: Locator;

  constructor(private readonly page: ScoutPage) {
    this.emptyPolicyTable = this.page.testSubj.locator('emptyPolicyTable');
    this.policyOnboardingInstructions = this.page.testSubj.locator('policyOnboardingInstructions');
    this.onboardingStartButton = this.page.testSubj.locator('onboardingStartButton');
    this.noFleetAccess = this.page.testSubj.locator('noFleetAccess');
    this.emptyHostsTable = this.page.testSubj.locator('emptyHostsTable');
    this.onboardingSteps = this.page.testSubj.locator('onboardingSteps');
  }

  /** Opens the endpoint list and waits for `readyWhen`, the policy onboarding by default. */
  async goto(readyWhen: Locator = this.policyOnboardingInstructions): Promise<void> {
    await this.page.gotoApp('security/administration/endpoints', {
      readyWhen,
      // The empty state renders after the user privileges, the endpoint list init and the
      // Defend policy list load; on a cold first load that can take longer than the 30s default.
      readyTimeout: APP_LOAD_TIMEOUT_MS,
    });
  }
}

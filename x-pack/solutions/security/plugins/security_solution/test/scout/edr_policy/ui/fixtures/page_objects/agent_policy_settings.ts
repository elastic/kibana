/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/** Settings tab of the Fleet agent policy details page, tamper protection section. */
export class AgentPolicySettingsPage {
  readonly nameField: Locator;
  readonly tamperProtectionSwitch: Locator;
  readonly missingIntegrationTooltip: Locator;
  readonly uninstallCommandLink: Locator;
  readonly lockedCard: Locator;
  readonly lockedCardBadge: Locator;
  readonly lockedCardTitle: Locator;

  constructor(private readonly page: ScoutPage) {
    this.nameField = this.page.testSubj.locator('createAgentPolicyNameField');
    this.tamperProtectionSwitch = this.page.testSubj.locator('tamperProtectionSwitch');
    this.missingIntegrationTooltip = this.page.testSubj.locator('tamperMissingIntegrationTooltip');
    this.uninstallCommandLink = this.page.testSubj.locator('uninstallCommandLink');
    this.lockedCard = this.page.testSubj.locator('endpointPolicy-agentTamperProtectionLockedCard');
    this.lockedCardBadge = this.page.testSubj.locator(
      'endpointSecurity-agentTamperProtectionLockedCard-badge'
    );
    this.lockedCardTitle = this.page.testSubj.locator(
      'endpointSecurity-agentTamperProtectionLockedCard-title'
    );
  }

  /** Opens the settings tab of `agentPolicyId` and waits until the policy form has loaded. */
  async goto(agentPolicyId: string): Promise<void> {
    await this.page.gotoApp(`fleet/policies/${agentPolicyId}/settings`, {
      readyWhen: this.nameField,
    });
  }
}

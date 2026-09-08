/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export class OnboardingApp {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('observabilityOnboarding');
    await this.landingWrapper.waitFor({ state: 'visible', timeout: 20_000 });
  }

  public get landingWrapper() {
    return this.page.getByTestId('addDataPageV2');
  }

  /**
   * V1 landing grid. Kept for the host-flow test that disables Add Data v2
   * and asserts the legacy page is restored.
   */
  public get useCaseGridByTestId() {
    return this.page.getByTestId('observabilityOnboardingUseCaseGrid');
  }

  integrationTile(id: string) {
    return this.page.getByTestId(`observabilityOnboardingIntegrationTile-${id}`);
  }

  miniTile(id: string) {
    return this.page.getByTestId(`observabilityOnboardingIntegrationMiniTile-${id}`);
  }

  async clickKubernetesTile() {
    await this.integrationTile('kubernetes').click();
    await this.page.waitForURL(/\/kubernetes(\?|$|#)/);
  }
}

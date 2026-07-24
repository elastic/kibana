/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

type HostOs = 'linux' | 'mac' | 'windows';
type HostTileId = 'linux' | 'macos' | 'windows';
type HostCollectionMethodId = 'otel' | 'auto-detect';

export class HostPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoLanding() {
    await this.page.gotoApp('observabilityOnboarding');
    await this.landingWrapper.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async gotoPath(path: string) {
    const normalized = path.replace(/^\//, '');
    await this.page.gotoApp(`observabilityOnboarding/${normalized}`);
  }

  public get landingWrapper() {
    return this.page.getByTestId('addDataPageV2');
  }

  hostTile(id: HostTileId) {
    return this.page.getByTestId(`observabilityOnboardingIntegrationTile-${id}`);
  }

  layout(os: HostOs) {
    return this.page.getByTestId(`observabilityOnboardingHostLayout-${os}`);
  }

  collectionMethodSelector() {
    return this.page.getByTestId('collectionMethodSelector');
  }

  collectionMethodCard(id: HostCollectionMethodId) {
    return this.page.getByTestId(`collectionMethodSelectorCard-${id}`);
  }

  ingestionSelector() {
    return this.page.getByTestId('observabilityOnboardingIngestionModeSelector');
  }

  otelInstallCodeBlock() {
    return this.page.getByTestId('observabilityOnboardingOtelLogsPanelCodeBlock');
  }

  visualizeActionLink(id: 'logs' | 'metrics') {
    return this.page.getByTestId(`observabilityOnboardingDataIngestStatusActionLink-${id}`);
  }

  returnLink() {
    return this.page.getByTestId('observabilityOnboardingHostReturn');
  }

  emptyPrompt() {
    return this.page.getByTestId('observabilityOnboardingEmptyPrompt');
  }

  emptyPromptRetryButton() {
    return this.page.getByTestId('observabilityOnboardingEmptyPromptRetryButton');
  }

  async stubHasDataAsPreExisting() {
    await this.page.route(
      (url) => url.pathname.includes('/internal/observability_onboarding/otel_host/has-data'),
      (route) => route.fulfill({ status: 200, body: JSON.stringify({ hasPreExistingData: true }) })
    );
  }

  async stubOtelHostSetupAsFailing() {
    let callCount = 0;
    await this.page.route(
      (url) => url.pathname.includes('/internal/observability_onboarding/otel_host/setup'),
      (route) => {
        callCount += 1;
        // Fail the first call; let retries pass through.
        if (callCount === 1) {
          return route.fulfill({
            status: 500,
            body: JSON.stringify({ message: 'simulated setup failure', statusCode: 500 }),
          });
        }
        return route.continue();
      }
    );
  }

  async clickHostTile(id: HostTileId) {
    const layoutOs: HostOs = id === 'macos' ? 'mac' : id;
    await this.hostTile(id).click();
    await this.layout(layoutOs).waitFor({ state: 'visible', timeout: 30_000 });
  }
}

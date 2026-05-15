/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

type HostV2Os = 'linux' | 'mac' | 'windows';
type HostTileId = 'linux' | 'macos' | 'windows';
type HostApproachId = 'otel' | 'auto-detect';

export class HostV2Page {
  constructor(private readonly page: ScoutPage) {}

  async gotoLanding() {
    await this.page.gotoApp('observabilityOnboarding');
    await this.v2LandingWrapper.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async gotoPath(path: string) {
    const normalized = path.replace(/^\//, '');
    await this.page.gotoApp(`observabilityOnboarding/${normalized}`);
  }

  public get v2LandingWrapper() {
    return this.page.getByTestId('addDataPageV2');
  }

  hostTile(id: HostTileId) {
    return this.page.getByTestId(`observabilityOnboardingIntegrationTile-${id}`);
  }

  layout(os: HostV2Os) {
    return this.page.getByTestId(`observabilityOnboardingHostV2Layout-${os}`);
  }

  approachSelector() {
    return this.page.getByTestId('approachSelector');
  }

  approachCard(id: HostApproachId) {
    return this.page.getByTestId(`approachSelectorCard-${id}`);
  }

  ingestionSelector() {
    return this.page.getByTestId('observabilityOnboardingIngestionModeSelector');
  }

  installCodeBlock() {
    return this.page
      .getByTestId('observabilityOnboardingAutoDetectPanelCodeSnippet')
      .or(this.page.getByTestId('observabilityOnboardingOtelLogsPanelCodeBlock'));
  }

  otelInstallCodeBlock() {
    return this.page.getByTestId('observabilityOnboardingOtelLogsPanelCodeBlock');
  }

  visualizeActionLink(id: 'logs' | 'metrics') {
    return this.page.getByTestId(`observabilityOnboardingDataIngestStatusActionLink-${id}`);
  }

  returnLink() {
    return this.page.getByTestId('observabilityOnboardingHostV2Return');
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
        // First call fails (initial setup); subsequent calls succeed so the
        // retry path can be validated against a real success response.
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
    const layoutOs: HostV2Os = id === 'macos' ? 'mac' : id;
    await this.hostTile(id).click();
    await this.layout(layoutOs).waitFor({ state: 'visible', timeout: 30_000 });
  }
}

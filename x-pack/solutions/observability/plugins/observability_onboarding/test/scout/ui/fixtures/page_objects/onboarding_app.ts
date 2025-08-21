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
    await this.page.waitForLoadState('networkidle');
    await this.page
      .getByText('What do you want to monitor?')
      .waitFor({ state: 'visible', timeout: 30000 });
  }

  get hostUseCaseTile() {
    return this.page.getByTestId('observabilityOnboardingUseCaseCard-host');
  }

  get kubernetesUseCaseTile() {
    return this.page.getByTestId('observabilityOnboardingUseCaseCard-kubernetes');
  }

  get cloudUseCaseTile() {
    return this.page.getByTestId('observabilityOnboardingUseCaseCard-cloud');
  }

  get applicationUseCaseTile() {
    return this.page.getByTestId('observabilityOnboardingUseCaseCard-application');
  }

  get autoDetectLogsCard() {
    return this.page.getByTestId('integration-card:auto-detect-logs');
  }

  get otelLogsCard() {
    return this.page.getByTestId('integration-card:otel-logs');
  }

  get kubernetesQuickStartCard() {
    return this.page.getByTestId('integration-card:kubernetes-quick-start');
  }

  get otelKubernetesCard() {
    return this.page.getByTestId('integration-card:otel-kubernetes');
  }

  get apmVirtualCard() {
    return this.page.getByTestId('integration-card:apm-virtual');
  }

  get otelVirtualCard() {
    return this.page.getByTestId('integration-card:otel-virtual');
  }

  get syntheticsVirtualCard() {
    return this.page.getByTestId('integration-card:synthetics-virtual');
  }

  get awsLogsVirtualCard() {
    return this.page.getByTestId('integration-card:aws-logs-virtual');
  }

  get azureLogsVirtualCard() {
    return this.page.getByTestId('integration-card:azure-logs-virtual');
  }

  get gcpLogsVirtualCard() {
    return this.page.getByTestId('integration-card:gcp-logs-virtual');
  }

  get firehoseQuickstartCard() {
    return this.page.getByTestId('integration-card:firehose-quick-start');
  }

  get useCaseGrid() {
    return this.page.locator('[role="group"][aria-labelledby]').first();
  }

  async selectHostUseCase() {
    const hostRadio = this.hostUseCaseTile.getByRole('radio');
    await hostRadio.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectKubernetesUseCase() {
    const kubernetesRadio = this.kubernetesUseCaseTile.getByRole('radio');
    await kubernetesRadio.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectCloudUseCase() {
    const cloudRadio = this.cloudUseCaseTile.getByRole('radio');
    await cloudRadio.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectApplicationUseCase() {
    const applicationRadio = this.applicationUseCaseTile.getByRole('radio');
    await applicationRadio.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickIntegrationCard(cardSelector: string) {
    const card = this.page.getByTestId(cardSelector);
    await card.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getGridColumnCount() {
    const gridStyle = await this.useCaseGrid.getAttribute('style');
    if (gridStyle?.includes('grid-template-columns')) {
      const columns = gridStyle.match(/repeat\((\d+),/);
      return columns ? parseInt(columns[1], 10) : null;
    }
    return null;
  }

  async getTileDescription(useCase: 'host' | 'kubernetes' | 'cloud' | 'application') {
    const tile = this.page.getByTestId(`observabilityOnboardingUseCaseCard-${useCase}`);
    const possibleSelectors = [
      '[color="subdued"]',
      '.euiText--small',
      '.euiTextColor--subdued',
      'p',
      '[data-test-subj*="description"]',
    ];

    for (const selector of possibleSelectors) {
      const description = tile.locator(selector);
      if ((await description.count()) > 0) {
        return await description.first().textContent();
      }
    }

    const allText = await tile.textContent();
    return allText;
  }
  async waitForMainTilesToLoad() {
    await this.hostUseCaseTile.waitFor({ state: 'visible' });
    await this.kubernetesUseCaseTile.waitFor({ state: 'visible' });
    await this.cloudUseCaseTile.waitFor({ state: 'visible' });
  }

  async waitForIntegrationCards() {
    await this.page.waitForSelector('[data-test-subj^="integration-card:"]', {
      state: 'visible',
      timeout: 10000,
    });
  }
}

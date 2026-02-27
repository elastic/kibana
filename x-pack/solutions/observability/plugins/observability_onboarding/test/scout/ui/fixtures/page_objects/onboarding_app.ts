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
    await this.useCaseGridByTestId.waitFor({ state: 'visible', timeout: 20_000 });
  }

  public get hostUseCaseTile() {
    return this.page.getByTestId('observabilityOnboardingUseCaseCard-host');
  }

  public get kubernetesUseCaseTile() {
    return this.page.getByTestId('observabilityOnboardingUseCaseCard-kubernetes');
  }

  public get cloudUseCaseTile() {
    return this.page.getByTestId('observabilityOnboardingUseCaseCard-cloud');
  }

  public get applicationUseCaseTile() {
    return this.page.getByTestId('observabilityOnboardingUseCaseCard-application');
  }

  public get autoDetectLogsCard() {
    return this.page.getByTestId('integration-card:auto-detect-logs');
  }

  public get otelLogsCard() {
    return this.page.getByTestId('integration-card:otel-logs');
  }

  public get kubernetesQuickStartCard() {
    return this.page.getByTestId('integration-card:kubernetes-quick-start');
  }

  public get otelKubernetesCard() {
    return this.page.getByTestId('integration-card:otel-kubernetes');
  }

  public get apmVirtualCard() {
    return this.page.getByTestId('integration-card:apm-virtual');
  }

  public get otelVirtualCard() {
    return this.page.getByTestId('integration-card:otel-virtual');
  }

  public get syntheticsVirtualCard() {
    return this.page.getByTestId('integration-card:synthetics-virtual');
  }

  public get awsLogsVirtualCard() {
    return this.page.getByTestId('integration-card:aws-logs-virtual');
  }

  public get azureLogsVirtualCard() {
    return this.page.getByTestId('integration-card:azure-logs-virtual');
  }

  public get gcpLogsVirtualCard() {
    return this.page.getByTestId('integration-card:gcp-logs-virtual');
  }

  public get firehoseQuickstartCard() {
    return this.page.getByTestId('integration-card:firehose-quick-start');
  }

  public get cloudforwarderQuickstartCard() {
    return this.page.getByTestId('integration-card:cloudforwarder-quick-start');
  }

  public get useCaseGrid() {
    return this.page.getByRole('group', { name: 'What do you want to monitor?' });
  }

  public get useCaseGridByTestId() {
    return this.page.getByTestId('observabilityOnboardingUseCaseGrid');
  }

  async getTileCount() {
    const grid = this.useCaseGridByTestId;
    const tiles = grid.locator('[data-test-subj^="observabilityOnboardingUseCaseCard-"]');
    return await tiles.count();
  }

  async openWithCategory(category: 'host' | 'kubernetes' | 'cloud' | 'application') {
    await this.page.gotoApp('observabilityOnboarding', { params: { category } });
    await this.waitForMainTilesToLoad();

    switch (category) {
      case 'host':
        await this.autoDetectLogsCard.waitFor({ state: 'visible' });
        break;
      case 'kubernetes':
        await this.kubernetesQuickStartCard.waitFor({ state: 'visible' });
        break;
      case 'cloud':
        await this.awsLogsVirtualCard.waitFor({ state: 'visible' });
        break;
      case 'application':
        await this.apmVirtualCard.waitFor({ state: 'visible' });
        break;
    }
  }

  async selectHostUseCase() {
    await this.hostUseCaseTile.getByRole('radio').click();
    await this.autoDetectLogsCard.waitFor({ state: 'visible' });
  }

  async selectKubernetesUseCase() {
    const kubernetesRadio = this.kubernetesUseCaseTile.getByRole('radio');
    await kubernetesRadio.click();
    await this.kubernetesQuickStartCard.waitFor({ state: 'visible' });
  }

  async selectCloudUseCase() {
    const cloudRadio = this.cloudUseCaseTile.getByRole('radio');
    await cloudRadio.click();
    await this.awsLogsVirtualCard.waitFor({ state: 'visible' });
  }

  async selectApplicationUseCase() {
    const applicationRadio = this.applicationUseCaseTile.getByRole('radio');
    await applicationRadio.click();
    await this.apmVirtualCard.waitFor({ state: 'visible' });
  }

  async clickIntegrationCard(cardSelector: string) {
    const card = this.page.getByTestId(cardSelector);
    await card.click();

    const nonRouting =
      /(aws-logs-virtual|azure-logs-virtual|gcp-logs-virtual|firehose-quick-start)/;
    if (!nonRouting.test(cardSelector)) {
      await this.page.waitForURL(
        /.*\/(auto-detect|kubernetes|otel-logs|otel-kubernetes|apm-virtual|otel-virtual|synthetics-virtual)/,
        { timeout: 30_000 }
      );
    }
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
        return await description.textContent();
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
}

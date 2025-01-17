/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Page, Locator } from '@playwright/test';

export class OnboardingHomePage {
  page: Page;

  private readonly otelKubernetesQuickStartCard: Locator;
  private readonly useCaseKubernetes: Locator;
  private readonly kubernetesQuickStartCard: Locator;
  private readonly useCaseHost: Locator;
  private readonly autoDetectElasticAgent: Locator;

  constructor(page: Page) {
    this.page = page;

    this.otelKubernetesQuickStartCard = this.page.getByTestId('integration-card:otel-kubernetes');
    this.useCaseKubernetes = this.page
      .getByTestId('observabilityOnboardingUseCaseCard-kubernetes')
      .getByRole('radio');
    this.kubernetesQuickStartCard = this.page.getByTestId(
      'integration-card:kubernetes-quick-start'
    );
    this.useCaseHost = this.page
      .getByTestId('observabilityOnboardingUseCaseCard-host')
      .getByRole('radio');
    this.autoDetectElasticAgent = this.page.getByTestId('integration-card:auto-detect-logs');
  }

  public async selectHostUseCase() {
    await this.useCaseHost.click();
  }

  public async selectKubernetesUseCase() {
    await this.useCaseKubernetes.click();
  }

  public async selectAutoDetectWithElasticAgent() {
    await this.autoDetectElasticAgent.click();
  }

  public async selectKubernetesQuickstart() {
    await this.kubernetesQuickStartCard.click();
  }

  public async selectOtelKubernetesQuickstart() {
    await this.otelKubernetesQuickStartCard.click();
  }
}

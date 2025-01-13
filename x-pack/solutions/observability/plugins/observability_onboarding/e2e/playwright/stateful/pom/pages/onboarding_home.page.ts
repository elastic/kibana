/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '@playwright/test';

export class OnboardingHomePage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private readonly useCaseKubernetes = () =>
    this.page.getByTestId('observabilityOnboardingUseCaseCard-kubernetes').getByRole('radio');

  private readonly kubernetesQuickStartCard = () =>
    this.page.getByTestId('integration-card:kubernetes-quick-start');

  private readonly useCaseHost = () =>
    this.page.getByTestId('observabilityOnboardingUseCaseCard-host').getByRole('radio');

  private readonly autoDetectElasticAgent = () =>
    this.page.getByTestId('integration-card:auto-detect-logs');

  public async selectHostUseCase() {
    await this.useCaseHost().click();
  }

  public async selectKubernetesUseCase() {
    await this.useCaseKubernetes().click();
  }

  public async selectAutoDetectWithElasticAgent() {
    await this.autoDetectElasticAgent().click();
  }

  public async selectKubernetesQuickstart() {
    await this.kubernetesQuickStartCard().click();
  }
}

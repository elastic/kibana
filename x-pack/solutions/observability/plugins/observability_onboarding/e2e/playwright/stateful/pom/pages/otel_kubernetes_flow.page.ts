/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '@playwright/test';

export class OtelKubernetesFlowPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async copyHelmRepositorySnippetToClipboard() {
    await this.page
      .getByTestId('observabilityOnboardingOtelKubernetesPanelAddRepositoryCopyToClipboard')
      .click();
  }

  public async copyInstallStackSnippetToClipboard() {
    await this.page
      .getByTestId('observabilityOnboardingOtelKubernetesPanelInstallStackCopyToClipboard')
      .click();
  }

  public async clickClusterOverviewDashboardCTA() {
    await this.page
      .getByTestId(
        'observabilityOnboardingDataIngestStatusActionLink-kubernetes_otel-cluster-overview'
      )
      .click();
  }
}

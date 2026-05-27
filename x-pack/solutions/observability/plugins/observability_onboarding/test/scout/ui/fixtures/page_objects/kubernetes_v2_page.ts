/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

type KubernetesCollectionMethodId = 'otel' | 'elastic-agent';

export class KubernetesV2Page {
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

  kubernetesTile() {
    return this.page.getByTestId('observabilityOnboardingIntegrationTile-kubernetes');
  }

  layout(method: KubernetesCollectionMethodId) {
    return this.page.getByTestId(`observabilityOnboardingKubernetesV2Layout-${method}`);
  }

  collectionMethodSelector() {
    return this.page.getByTestId('collectionMethodSelector');
  }

  collectionMethodCard(id: KubernetesCollectionMethodId) {
    return this.page.getByTestId(`collectionMethodSelectorCard-${id}`);
  }

  ingestionSelector() {
    return this.page.getByTestId('observabilityOnboardingIngestionModeSelector');
  }

  returnLink() {
    return this.page.getByTestId('observabilityOnboardingKubernetesV2Return');
  }

  emptyPrompt() {
    return this.page.getByTestId('observabilityOnboardingEmptyPrompt');
  }

  emptyPromptRetryButton() {
    return this.page.getByTestId('observabilityOnboardingEmptyPromptRetryButton');
  }
}

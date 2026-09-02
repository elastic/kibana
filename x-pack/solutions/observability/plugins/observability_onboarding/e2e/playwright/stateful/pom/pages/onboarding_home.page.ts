/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Page, Locator } from '@playwright/test';

type LandingVersion = 'v1' | 'v2';

export class OnboardingHomePage {
  page: Page;

  private landingVersion: LandingVersion | undefined;

  private readonly landingWrapper: Locator;
  private readonly useCaseGrid: Locator;
  private readonly linuxTile: Locator;
  private readonly macosTile: Locator;
  private readonly kubernetesTile: Locator;
  private readonly autoDetectCollectionMethod: Locator;

  private readonly useCaseHost: Locator;
  private readonly useCaseKubernetes: Locator;
  private readonly autoDetectElasticAgent: Locator;
  private readonly otelHostCard: Locator;
  readonly introducingAIAgentModalContinueBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.landingWrapper = this.page.getByTestId('addDataPageV2');
    this.useCaseGrid = this.page.getByTestId('observabilityOnboardingUseCaseGrid');
    this.linuxTile = this.page.getByTestId('observabilityOnboardingIntegrationTile-linux');
    this.macosTile = this.page.getByTestId('observabilityOnboardingIntegrationTile-macos');
    this.kubernetesTile = this.page.getByTestId(
      'observabilityOnboardingIntegrationTile-kubernetes'
    );
    this.autoDetectCollectionMethod = this.page.getByTestId(
      'collectionMethodSelectorCard-auto-detect'
    );

    this.useCaseHost = this.page
      .getByTestId('observabilityOnboardingUseCaseCard-host')
      .getByRole('radio');
    this.useCaseKubernetes = this.page
      .getByTestId('observabilityOnboardingUseCaseCard-kubernetes')
      .getByRole('radio');
    this.autoDetectElasticAgent = this.page.getByTestId('integration-card:auto-detect-logs');
    this.otelHostCard = this.page.getByTestId('integration-card:otel-logs');
    this.introducingAIAgentModalContinueBtn = this.page.getByTestId(
      'agentBuilderAnnouncementContinueButton'
    );
  }

  public get isV2Landing(): boolean {
    return this.landingVersion === 'v2';
  }

  public async waitForLanding() {
    await this.landingWrapper.or(this.useCaseGrid).waitFor({ state: 'visible', timeout: 20_000 });
    this.landingVersion = (await this.landingWrapper.isVisible()) ? 'v2' : 'v1';
  }

  private async ensureLanding() {
    if (!this.landingVersion) {
      await this.waitForLanding();
    }
  }

  public async selectLinuxHost() {
    await this.ensureLanding();
    if (this.landingVersion === 'v2') {
      await this.linuxTile.click();
      return;
    }
    await this.useCaseHost.click();
  }

  public async selectMacosHost() {
    await this.ensureLanding();
    if (this.landingVersion === 'v2') {
      await this.macosTile.click();
      return;
    }
    await this.useCaseHost.click();
  }

  public async selectAutoDetectCollectionMethod() {
    await this.ensureLanding();
    if (this.landingVersion === 'v2') {
      await this.autoDetectCollectionMethod.click();
      await this.page.waitForURL(/\/host\/linux\/auto-detect/);
      return;
    }
    await this.autoDetectElasticAgent.click();
  }

  public async selectKubernetesOtel() {
    await this.ensureLanding();
    if (this.landingVersion === 'v2') {
      await this.kubernetesTile.click();
    } else {
      await this.useCaseKubernetes.click();
    }
    await this.page.waitForURL(/\/kubernetes(\?|$|#)/);
  }

  /**
   * Opens the OTel host flow for the given OS.
   * v2: clicks the linux/macos tile (OTel is the default collection method).
   * v1: host radio + otel-logs card. Caller still needs selectPlatform on v1.
   */
  public async openOtelHostFromLanding(osName: string): Promise<LandingVersion> {
    await this.ensureLanding();
    if (this.landingVersion === 'v2') {
      if (this.isMacOs(osName)) {
        await this.macosTile.click();
      } else {
        await this.linuxTile.click();
      }
      return 'v2';
    }
    await this.useCaseHost.click();
    await this.otelHostCard.click();
    return 'v1';
  }

  private isMacOs(osName: string): boolean {
    const normalized = osName.toLowerCase();
    return normalized === 'darwin' || normalized === 'macos' || normalized === 'mac';
  }

  public async gotoKubernetesElasticAgentFlow() {
    await this.page.goto(
      `${process.env.KIBANA_BASE_URL}/app/observabilityOnboarding/kubernetes/elastic-agent`
    );
  }

  public async maybeClickIntroducingAIAgentModalContinueBtn() {
    await this.page.addLocatorHandler(
      this.introducingAIAgentModalContinueBtn,
      async (btn) => {
        await btn.click();
      },
      { times: 1 }
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { APP_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';

const ONBOARDING_APP = 'security/get_started';
// `OnboardingCardId.integrations`, the "Add data with integrations" card. The card id in the URL
// hash makes the Security onboarding expand that card.
const INTEGRATIONS_CARD_ID = 'integrations';

/**
 * Security Get started page, focused on its "Add data with integrations" card: the integrations
 * grid, collection tiles and the variant chooser flyout.
 */
export class OnboardingPage {
  readonly allIntegrationsTab: Locator;
  readonly integrationsSearchBar: Locator;
  readonly collectionFlyout: Locator;

  constructor(private readonly page: ScoutPage) {
    this.allIntegrationsTab = this.page.testSubj.locator('securitySolutionIntegrationsTab-all');
    this.integrationsSearchBar = this.page.testSubj.locator('epmList.searchBar');
    this.collectionFlyout = this.page.testSubj.locator('collectionFlyout');
  }

  /** Opens Get started with the integrations card expanded and switches to its "All" tab. */
  async gotoIntegrationsCard(): Promise<void> {
    await this.page.gotoApp(ONBOARDING_APP, {
      hash: INTEGRATIONS_CARD_ID,
      readyWhen: this.allIntegrationsTab,
      readyTimeout: APP_LOAD_TIMEOUT_MS,
    });
    await this.allIntegrationsTab.click();
  }

  /**
   * Filters the integrations grid. The grid renders its tiles in pages as the user scrolls, so a
   * search is what keeps a given tile within the rendered ones.
   */
  async searchIntegrations(term: string): Promise<void> {
    await this.integrationsSearchBar.fill(term);
  }

  /** Tile of a collection of packages that share a `group`, e.g. `nginx`. */
  collectionCard(groupId: string): Locator {
    return this.page.testSubj.locator(`integration-card:collection:${groupId}`);
  }

  /** Tile of a single package. */
  integrationCard(packageName: string): Locator {
    return this.page.testSubj.locator(`integration-card:epr:${packageName}`);
  }

  /** Row of a package in the collection chooser flyout. */
  collectionVariantRow(packageName: string): Locator {
    return this.page.testSubj.locator(`collectionVariantRow-epr:${packageName}`);
  }
}

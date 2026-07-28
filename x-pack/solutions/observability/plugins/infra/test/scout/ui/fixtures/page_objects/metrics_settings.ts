/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

/**
 * Metrics settings (source configuration) page. Encapsulates the source configuration
 * form (`nameInput`/`metricIndicesInput` + the shared `BottomBarActions` save/discard
 * buttons) and the index-status callouts, replacing the FTR `infraSourceConfigurationForm`
 * service and the related `infraHome` callout helpers.
 */
export class MetricsSettingsPage {
  public readonly nameInput: Locator;
  public readonly metricIndicesInput: Locator;
  public readonly saveButton: Locator;
  public readonly discardButton: Locator;
  public readonly missingMetricIndicesCallout: Locator;
  public readonly remoteClusterDangerCallout: Locator;
  public readonly usedByRulesWarningCallout: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.nameInput = this.page.getByTestId('nameInput');
    this.metricIndicesInput = this.page.getByTestId('metricIndicesInput');
    this.saveButton = this.page.getByTestId('infraBottomBarActionsButton');
    this.discardButton = this.page.getByTestId('infraBottomBarActionsDiscardChangesButton');
    this.missingMetricIndicesCallout = this.page.getByTestId(
      'infraIndicesPanelSettingsWarningCallout'
    );
    this.remoteClusterDangerCallout = this.page.getByTestId(
      'infraIndicesPanelSettingsDangerCallout'
    );
    this.usedByRulesWarningCallout = this.page.getByTestId(
      'infraIndicesPanelSettingsWarningCalloutUsedByRules'
    );
  }

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('metrics')}/settings`);
    await this.nameInput.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async setName(value: string) {
    await this.nameInput.fill(value);
  }

  async getName() {
    return this.nameInput.inputValue();
  }

  async setMetricIndices(value: string) {
    await this.metricIndicesInput.fill(value);
  }

  async save() {
    await this.saveButton.click();
    // The bottom action bar unmounts once the source is persisted and the form is no
    // longer dirty, so waiting for it to detach confirms the save round-tripped.
    await this.saveButton.waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
  }

  async discardChanges() {
    await this.discardButton.click();
    await this.saveButton.waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';
import { TRUSTED_APP_HASH } from '../artifact_tabs_test_data';

export type PolicyArtifactKind =
  | 'trustedApps'
  | 'eventFilters'
  | 'blocklists'
  | 'hostIsolationExceptions'
  | 'trustedDevices'
  | 'endpointExceptions';

export class PolicyArtifactsPage {
  readonly emptyUnexisting: Locator;
  readonly emptyUnassigned: Locator;
  readonly unexistingManageButton: Locator;
  readonly unexistingImportButton: Locator;
  readonly unassignedManageButton: Locator;
  readonly unassignedAssignButton: Locator;
  readonly assignButton: Locator;
  readonly assignFlyout: Locator;
  readonly assignConfirmButton: Locator;
  readonly assignCancelButton: Locator;
  readonly artifactCard: Locator;
  readonly artifactCardTitle: Locator;
  readonly cardActionsButton: Locator;
  readonly viewFullDetailsAction: Locator;
  readonly removeFromPolicyAction: Locator;
  readonly confirmModalConfirmButton: Locator;
  readonly perPolicyRadio: Locator;

  constructor(private readonly page: ScoutPage) {
    this.emptyUnexisting = this.page.testSubj.locator('policy-artifacts-empty-unexisting');
    this.emptyUnassigned = this.page.testSubj.locator('policy-artifacts-empty-unassigned');
    this.unexistingManageButton = this.page.testSubj.locator('unexisting-manage-artifacts-button');
    this.unexistingImportButton = this.page.testSubj.locator(
      'unexisting-manage-artifacts-import-button'
    );
    this.unassignedManageButton = this.page.testSubj.locator('unassigned-manage-artifacts-button');
    this.unassignedAssignButton = this.page.testSubj.locator('unassigned-assign-artifacts-button');
    this.assignButton = this.page.testSubj.locator('artifacts-assign-button');
    this.assignFlyout = this.page.testSubj.locator('artifacts-assign-flyout');
    this.assignConfirmButton = this.page.testSubj.locator('artifacts-assign-confirm-button');
    this.assignCancelButton = this.page.testSubj.locator('artifacts-assign-cancel-button');
    this.artifactCard = this.page.testSubj.locator('artifacts-collapsed-list-card');
    this.artifactCardTitle = this.page.testSubj.locator(
      'artifacts-collapsed-list-card-header-titleHolder'
    );
    this.cardActionsButton = this.page.testSubj.locator(
      'artifacts-collapsed-list-card-header-actions-button'
    );
    this.viewFullDetailsAction = this.page.testSubj.locator('view-full-details-action');
    this.removeFromPolicyAction = this.page.testSubj.locator('remove-from-policy-action');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    // Forms prefix this id (`*-form-effectedPolicies-perPolicy`).
    this.perPolicyRadio = this.page.getByTestId(/-perPolicy$/);
  }

  criteria(selector: string): Locator {
    return this.page.testSubj.locator(selector);
  }

  artifactCheckbox(artifactName: string): Locator {
    return this.page.testSubj.locator(`${artifactName}_checkbox`);
  }

  async waitForEmptyUnexisting() {
    await this.emptyUnexisting.waitFor({ state: 'visible' });
  }

  async waitForEmptyUnassigned() {
    await this.emptyUnassigned.waitFor({ state: 'visible' });
  }

  async waitForAssignedList() {
    await this.artifactCard.waitFor({ state: 'visible' });
  }

  async openCreateFromEmptyTab() {
    await this.unexistingManageButton.click();
  }

  async openManageFromUnassigned() {
    await this.unassignedManageButton.click();
  }

  async openAssignFromUnassigned() {
    await this.unassignedAssignButton.click();
    await this.assignFlyout.waitFor({ state: 'visible' });
  }

  async openAssignFlyout() {
    await this.assignButton.click();
    await this.assignFlyout.waitFor({ state: 'visible' });
  }

  async cancelAssignFlyout() {
    await this.assignCancelButton.click();
  }

  async assignArtifact(artifactName: string) {
    await this.artifactCheckbox(artifactName).click();
    await this.assignConfirmButton.click();
  }

  async openCardActions() {
    await this.cardActionsButton.click();
  }

  async removeAssignedArtifactFromPolicy() {
    await this.openCardActions();
    await this.removeFromPolicyAction.click();
    await this.confirmModalConfirmButton.click();
  }

  async selectPerPolicyAssignment() {
    await this.perPolicyRadio.click();
  }

  async submitCreateForm(pagePrefix: string) {
    await this.page.testSubj.locator(`${pagePrefix}-flyout-submitButton`).click();
  }

  async fillCreateForm(kind: PolicyArtifactKind) {
    switch (kind) {
      case 'trustedApps':
        await this.fillTrustedAppsForm();
        return;
      case 'eventFilters':
        await this.fillEventFiltersForm();
        return;
      case 'blocklists':
        await this.fillBlocklistForm();
        return;
      case 'hostIsolationExceptions':
        await this.fillHostIsolationExceptionsForm();
        return;
      case 'trustedDevices':
        await this.fillTrustedDevicesForm();
        return;
      case 'endpointExceptions':
        await this.fillEndpointExceptionsForm();
    }
  }

  private async fillComboBox(testSubj: string, value: string, custom = false) {
    const combo = this.page.components.comboBox(testSubj);
    if (custom) {
      await combo.setCustomSelectedOptions([value]);
      return;
    }
    // Field autocomplete is backed by ES field caps and can lag after first
    // document ingest; the EUI helper default (2.5s) is too short.
    await combo.setSelectedOptions([value], { timeout: 10_000 });
  }

  private async fillTrustedAppsForm() {
    await this.page.testSubj
      .locator('trustedApps-form-nameTextField')
      .fill('Trusted application name');
    await this.page.testSubj
      .locator('trustedApps-form-descriptionField')
      .fill('This is the trusted application description');
    await this.page.testSubj
      .locator('trustedApps-form-conditionsBuilder-group1-entry0-field')
      .click();
    await this.page.testSubj
      .locator('trustedApps-form-conditionsBuilder-group1-entry0-field-type-Hash')
      .click();
    await this.page.testSubj
      .locator('trustedApps-form-conditionsBuilder-group1-entry0-value')
      .fill(TRUSTED_APP_HASH.toUpperCase());
  }

  private async fillEventFiltersForm() {
    await this.page.testSubj.locator('eventFilters-form-name-input').fill('Event filter name');
    await this.page.testSubj
      .locator('eventFilters-form-description-input')
      .fill('This is the event filter description');
    await this.fillComboBox('fieldAutocompleteComboBox', '@timestamp');
    await this.fillComboBox('valuesAutocompleteMatch', '1234', true);
    await this.page.testSubj.locator('eventFilters-form-description-input').click();
  }

  private async fillBlocklistForm() {
    await this.page.testSubj.locator('blocklist-form-name-input').fill('Blocklist name');
    await this.page.testSubj
      .locator('blocklist-form-description-input')
      .fill('This is the blocklist description');
    await this.page.testSubj.locator('blocklist-form-field-select').click();
    await this.page.testSubj.locator('blocklist-form-file.hash.*').click();
    await this.fillComboBox('blocklist-form-values-input', TRUSTED_APP_HASH.toUpperCase(), true);
    await this.page.testSubj.locator('blocklist-form-name-input').click();
  }

  private async fillHostIsolationExceptionsForm() {
    await this.page.testSubj
      .locator('hostIsolationExceptions-form-name-input')
      .fill('Host Isolation exception name');
    await this.page.testSubj
      .locator('hostIsolationExceptions-form-description-input')
      .fill('This is the host isolation exception description');
    await this.page.testSubj.locator('hostIsolationExceptions-form-ip-input').fill('1.1.1.1');
  }

  private async fillTrustedDevicesForm() {
    await this.page.testSubj
      .locator('trustedDevices-form-nameTextField')
      .fill('Trusted device name');
    await this.page.testSubj
      .locator('trustedDevices-form-descriptionField')
      .fill('This is the trusted device description');
    // OS is an EuiComboBox; field is an EuiSuperSelect. Both render options in
    // a body portal, so page-wide `getByRole('option')` can hit the wrong list.
    await this.fillComboBox('trustedDevices-form-osSelectField', 'Windows and Mac');
    await this.page.components
      .superSelect('trustedDevices-form-entry0fieldSelect')
      .selectOptionByLabel('Host');
    await this.fillComboBox('trustedDevices-form-entry0valueField', 'test-host', true);
  }

  private async fillEndpointExceptionsForm() {
    await this.page.testSubj
      .locator('endpointExceptions-form-name-input')
      .fill('Endpoint exception name');
    await this.page.testSubj
      .locator('endpointExceptions-form-description-input')
      .fill('This is the endpoint exception description');
    await this.fillComboBox('fieldAutocompleteComboBox', 'agent.version');
    await this.fillComboBox('valuesAutocompleteMatch', '1234', true);
    await this.page.testSubj.locator('endpointExceptions-form-description-input').click();
  }
}

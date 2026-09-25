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

const ARTIFACT_FORM_IDENTITY_FIELDS: Record<
  PolicyArtifactKind,
  { name: string; description: string }
> = {
  trustedApps: {
    name: 'trustedApps-form-nameTextField',
    description: 'trustedApps-form-descriptionField',
  },
  eventFilters: {
    name: 'eventFilters-form-name-input',
    description: 'eventFilters-form-description-input',
  },
  blocklists: {
    name: 'blocklist-form-name-input',
    description: 'blocklist-form-description-input',
  },
  hostIsolationExceptions: {
    name: 'hostIsolationExceptions-form-name-input',
    description: 'hostIsolationExceptions-form-description-input',
  },
  trustedDevices: {
    name: 'trustedDevices-form-nameTextField',
    description: 'trustedDevices-form-descriptionField',
  },
  endpointExceptions: {
    name: 'endpointExceptions-form-name-input',
    description: 'endpointExceptions-form-description-input',
  },
};

export type BlocklistOperator = 'is' | 'is one of';

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
  readonly blocklistFieldSelect: Locator;
  readonly blocklistOperatorSelect: Locator;
  readonly blocklistValueInput: Locator;
  readonly blocklistValuesInput: Locator;

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
    this.blocklistFieldSelect = this.page.testSubj.locator('blocklist-form-field-select');
    this.blocklistOperatorSelect = this.page.testSubj.locator(
      'blocklist-form-operator-select-multi'
    );
    this.blocklistValueInput = this.page.testSubj.locator('blocklist-form-value-input');
    this.blocklistValuesInput = this.page.testSubj.locator('blocklist-form-values-input');
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

  async fillNameAndDescription(kind: PolicyArtifactKind, name: string, description: string) {
    const fields = ARTIFACT_FORM_IDENTITY_FIELDS[kind];
    await this.page.testSubj.locator(fields.name).fill(name);
    await this.page.testSubj.locator(fields.description).fill(description);
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
    await this.fillNameAndDescription(
      'trustedApps',
      'Trusted application name',
      'This is the trusted application description'
    );
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
    await this.fillNameAndDescription(
      'eventFilters',
      'Event filter name',
      'This is the event filter description'
    );
    await this.fillComboBox('fieldAutocompleteComboBox', '@timestamp');
    await this.fillComboBox('valuesAutocompleteMatch', '1234', true);
    await this.page.testSubj.locator('eventFilters-form-description-input').click();
  }

  private async fillBlocklistForm() {
    await this.fillNameAndDescription(
      'blocklists',
      'Blocklist name',
      'This is the blocklist description'
    );
    await this.blocklistFieldSelect.click();
    await this.page.testSubj.locator('blocklist-form-file.hash.*').click();
    await this.fillComboBox('blocklist-form-values-input', TRUSTED_APP_HASH.toUpperCase(), true);
    await this.page.testSubj.locator('blocklist-form-name-input').click();
  }

  /**
   * Windows signature is the only blocklist field whose operator can be
   * `is` (single value) or `is one of` (combo). Hash/path keep a read-only
   * "is one of".
   */
  async fillBlocklistSignatureCreateForm({
    name,
    description,
    operator,
    value,
  }: {
    name: string;
    description: string;
    operator: BlocklistOperator;
    value: string | string[];
  }) {
    await this.fillNameAndDescription('blocklists', name, description);
    await this.selectBlocklistSignatureField();
    await this.selectBlocklistOperator(operator);
    await this.fillBlocklistSignatureValue(operator, value);
  }

  private async selectBlocklistSignatureField() {
    // SuperSelect's listbox is page-global and `open()` no-ops if any listbox
    // is still visible. Selecting via the helper waits for this dropdown to
    // detach so the operator SuperSelect can open afterward.
    await this.page.components
      .superSelect('blocklist-form-field-select')
      .selectOptionByValue('file.Ext.code_signature');
    await this.blocklistOperatorSelect.waitFor({ state: 'visible' });
  }

  async selectBlocklistOperator(operator: BlocklistOperator) {
    // Value is ListOperatorTypeEnum (`match` / `match_any`). Label `is` is a
    // prefix of `is one of`, so select by value rather than accessible name.
    await this.blocklistOperatorSelect.waitFor({ state: 'visible' });
    await this.page.components
      .superSelect('blocklist-form-operator-select-multi')
      .selectOptionByValue(operator === 'is' ? 'match' : 'match_any');

    if (operator === 'is') {
      await this.blocklistValueInput.waitFor({ state: 'visible' });
      return;
    }
    await this.blocklistValuesInput.waitFor({ state: 'visible' });
  }

  private async fillBlocklistSignatureValue(operator: BlocklistOperator, value: string | string[]) {
    if (operator === 'is') {
      const singleValue = Array.isArray(value) ? value.join(',') : value;
      await this.blocklistValueInput.fill(singleValue);
      return;
    }

    const values = Array.isArray(value) ? value : [value];
    await this.page.components
      .comboBox('blocklist-form-values-input')
      .setCustomSelectedOptions(values);
    await this.page.testSubj.locator('blocklist-form-name-input').click();
  }

  private async fillHostIsolationExceptionsForm() {
    await this.fillNameAndDescription(
      'hostIsolationExceptions',
      'Host Isolation exception name',
      'This is the host isolation exception description'
    );
    await this.page.testSubj.locator('hostIsolationExceptions-form-ip-input').fill('1.1.1.1');
  }

  private async fillTrustedDevicesForm() {
    await this.fillNameAndDescription(
      'trustedDevices',
      'Trusted device name',
      'This is the trusted device description'
    );
    // OS is an EuiComboBox; field is an EuiSuperSelect. Both render options in
    // a body portal, so page-wide `getByRole('option')` can hit the wrong list.
    await this.fillComboBox('trustedDevices-form-osSelectField', 'Windows and Mac');
    await this.page.components
      .superSelect('trustedDevices-form-entry0fieldSelect')
      .selectOptionByLabel('Host');
    await this.fillComboBox('trustedDevices-form-entry0valueField', 'test-host', true);
  }

  private async fillEndpointExceptionsForm() {
    await this.fillNameAndDescription(
      'endpointExceptions',
      'Endpoint exception name',
      'This is the endpoint exception description'
    );
    await this.fillComboBox('fieldAutocompleteComboBox', 'agent.version');
    await this.fillComboBox('valuesAutocompleteMatch', '1234', true);
    await this.page.testSubj.locator('endpointExceptions-form-description-input').click();
  }
}

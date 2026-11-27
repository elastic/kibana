/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import type { Locator, ScoutPage } from '@kbn/scout-security';

/** Protection updates tab of the endpoint policy details page. Actions and locators only. */
export class ProtectionUpdatesPage {
  readonly title: Locator;
  readonly warningCallout: Locator;
  readonly automaticUpdatesEnabledCallout: Locator;
  readonly automaticUpdatesSwitch: Locator;
  readonly automaticUpdatesViewMode: Locator;
  readonly deployedVersionTitle: Locator;
  readonly deployedVersion: Locator;
  readonly versionToDeployTitle: Locator;
  readonly versionToDeployPicker: Locator;
  readonly versionToDeployInput: Locator;
  readonly versionToDeployViewMode: Locator;
  readonly noteTitle: Locator;
  readonly note: Locator;
  readonly noteViewMode: Locator;
  readonly saveButton: Locator;
  readonly successToast: Locator;
  readonly settingsTab: Locator;

  constructor(private readonly page: ScoutPage) {
    this.title = this.page.testSubj.locator('protection-updates-manifest-name-title');
    this.warningCallout = this.page.testSubj.locator('protection-updates-warning-callout');
    this.automaticUpdatesEnabledCallout = this.page.testSubj.locator(
      'protection-updates-automatic-updates-enabled'
    );
    this.automaticUpdatesSwitch = this.page.testSubj.locator('protection-updates-manifest-switch');
    this.automaticUpdatesViewMode = this.page.testSubj.locator(
      'protection-updates-state-view-mode'
    );
    this.deployedVersionTitle = this.page.testSubj.locator(
      'protection-updates-manifest-name-deployed-version-title'
    );
    this.deployedVersion = this.page.testSubj.locator('protection-updates-deployed-version');
    this.versionToDeployTitle = this.page.testSubj.locator(
      'protection-updates-manifest-name-version-to-deploy-title'
    );
    this.versionToDeployPicker = this.page.testSubj.locator(
      'protection-updates-version-to-deploy-picker'
    );
    this.versionToDeployInput = this.versionToDeployPicker.getByRole('textbox');
    this.versionToDeployViewMode = this.page.testSubj.locator(
      'protection-updates-version-to-deploy-view-mode'
    );
    this.noteTitle = this.page.testSubj.locator('protection-updates-manifest-name-note-title');
    this.note = this.page.testSubj.locator('protection-updates-manifest-note');
    this.noteViewMode = this.page.testSubj.locator('protection-updates-manifest-note-view-mode');
    this.saveButton = this.page.testSubj.locator('protectionUpdatesSaveButton');
    this.successToast = this.page.testSubj.locator('protectionUpdatesSuccessfulMessage');
    this.settingsTab = this.page.testSubj.locator('policySettingsTab');
  }

  /** Opens the tab of `policyId` and waits until the policy has loaded into it. */
  async goto(policyId: string): Promise<void> {
    await this.page.gotoApp(`security/administration/policy/${policyId}/protectionUpdates`, {
      readyWhen: this.title,
      // A cold Security app load after a custom-role login can exceed the 30s default.
      readyTimeout: APP_LOAD_TIMEOUT_MS,
    });
  }

  async toggleAutomaticUpdates(): Promise<void> {
    await this.automaticUpdatesSwitch.click();
  }

  /** Types `date` (`MMMM DD, YYYY`) into the date picker as a user would, then closes its popover. */
  async setVersionToDeploy(date: string): Promise<void> {
    await this.versionToDeployInput.clear();
    await this.versionToDeployInput.pressSequentially(date);
    await this.versionToDeployInput.press('Escape');
  }

  async replaceNote(text: string): Promise<void> {
    await this.note.fill(text);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async openSettingsTab(): Promise<void> {
    await this.settingsTab.click();
  }
}

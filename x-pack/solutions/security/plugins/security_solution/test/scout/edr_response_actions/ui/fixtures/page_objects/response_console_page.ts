/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

const LAST_7_DAYS_TEST_SUBJ = 'superDatePickerCommonlyUsed_Last_7 days';
const CONSOLE_PREFIX = 'endpointResponseActionsConsole';
const GET_FILE_DOWNLOAD_LINK = 'getFile-actionResult-getFileResults-getFileDownloadLink';

/**
 * Response console overlay for an Endpoint host, opened from an alert flyout or
 * the endpoint list. Actions only; the spec asserts.
 */
export class ResponseConsolePage {
  readonly commandInput: Locator;
  readonly submitButton: Locator;
  readonly getFilePending: Locator;
  readonly getFileSuccess: Locator;
  readonly getFilePendingHostStatus: Locator;
  readonly getFileSuccessHostStatus: Locator;
  readonly getFileDownloadButton: Locator;
  readonly getFilePasscodeMessage: Locator;
  readonly getFileDeleteMessage: Locator;
  readonly overlay: Locator;
  readonly respondAction: Locator;
  readonly userMenu: Locator;
  readonly backLink: Locator;
  readonly actionLogButton: Locator;
  readonly actionLogFlyout: Locator;
  readonly actionLogDateQuickMenuButton: Locator;
  readonly actionLogDatesButton: Locator;
  readonly dateQuickMenu: Locator;
  private readonly last7DaysOption: Locator;

  constructor(private readonly page: ScoutPage) {
    this.commandInput = page.testSubj.locator(`${CONSOLE_PREFIX}-inputCapture`);
    this.submitButton = page.testSubj.locator(`${CONSOLE_PREFIX}-inputTextSubmitButton`);
    this.getFilePending = page.testSubj.locator('getFile-pending');
    this.getFileSuccess = page.testSubj.locator('getFile-success');
    this.getFilePendingHostStatus = this.getFilePending.getByTestId(
      'getFile-actionResult-hostStatus'
    );
    this.getFileSuccessHostStatus = this.getFileSuccess.getByTestId(
      'getFile-actionResult-hostStatus'
    );
    this.getFileDownloadButton = this.getFileSuccess.getByTestId(
      `${GET_FILE_DOWNLOAD_LINK}-downloadButton`
    );
    this.getFilePasscodeMessage = this.getFileSuccess.getByTestId(
      `${GET_FILE_DOWNLOAD_LINK}-passcodeMessage`
    );
    this.getFileDeleteMessage = this.getFileSuccess.getByTestId(
      `${GET_FILE_DOWNLOAD_LINK}-fileDeleteMessage`
    );
    this.overlay = page.testSubj.locator('consolePageOverlay');
    this.respondAction = page.testSubj.locator('endpointResponseActions-action-item');
    this.userMenu = page.testSubj.locator('userMenuButton');
    this.backLink = page.testSubj.locator('consolePageOverlay-header-back-link');
    this.actionLogButton = page.testSubj.locator('responderShowActionLogButton');
    this.actionLogFlyout = page.testSubj.locator('responderActionLogFlyout');
    this.actionLogDateQuickMenuButton = this.actionLogFlyout.getByTestId(
      'superDatePickerToggleQuickMenuButton'
    );
    this.actionLogDatesButton = this.actionLogFlyout.getByTestId('superDatePickerShowDatesButton');
    this.dateQuickMenu = page.testSubj.locator('superDatePickerQuickMenu');
    this.last7DaysOption = page.testSubj.locator(LAST_7_DAYS_TEST_SUBJ);
  }

  async openFromRespondAction(): Promise<void> {
    await this.respondAction.click();
    await this.overlay.waitFor({ state: 'visible' });
  }

  /** Types `command` into the console input. The input listens for key events, not `fill`. */
  async enterCommand(command: string): Promise<void> {
    await this.commandInput.click();
    await this.page.keyboard.type(command);
  }

  async submitCommand(): Promise<void> {
    await this.submitButton.click();
  }

  async openActionLog(): Promise<void> {
    await this.actionLogButton.click();
    await this.actionLogFlyout.waitFor({ state: 'visible' });
  }

  /** Opens the history date quick menu and chooses Last 7 days. */
  async selectActionLogLast7Days(): Promise<void> {
    await this.actionLogDateQuickMenuButton.click();
    await this.dateQuickMenu.waitFor({ state: 'visible' });
    await this.last7DaysOption.click();
    await this.dateQuickMenu.waitFor({ state: 'hidden' });
  }

  async closeActionLog(): Promise<void> {
    await this.actionLogFlyout.getByTestId('euiFlyoutCloseButton').click();
    await this.actionLogFlyout.waitFor({ state: 'hidden' });
  }

  async close(): Promise<void> {
    await this.backLink.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }
}

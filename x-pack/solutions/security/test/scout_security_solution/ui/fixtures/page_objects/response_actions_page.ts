/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { APP_ENDPOINTS_PATH, APP_RESPONSE_ACTIONS_HISTORY_PATH } from '../../common/defend_workflows_urls';

const RESPONDER_PAGE = 'consolePageOverlay';
const ACTION_LOG_FLYOUT = 'responderActionLogFlyout';

export type ResponseActionCommand =
  | 'isolate'
  | 'release'
  | 'processes'
  | 'kill-process'
  | 'suspend-process'
  | 'get-file'
  | 'execute'
  | 'upload'
  | 'scan';

const COMMAND_TEST_SUBJ: Record<ResponseActionCommand, string> = {
  isolate: 'endpointResponseActionsConsole-commandList-Responseactions-isolate',
  release: 'endpointResponseActionsConsole-commandList-Responseactions-release',
  processes: 'endpointResponseActionsConsole-commandList-Responseactions-processes',
  'kill-process': 'endpointResponseActionsConsole-commandList-Responseactions-kill-process',
  'suspend-process': 'endpointResponseActionsConsole-commandList-Responseactions-suspend-process',
  'get-file': 'endpointResponseActionsConsole-commandList-Responseactions-get-file',
  execute: 'endpointResponseActionsConsole-commandList-Responseactions-execute',
  upload: 'endpointResponseActionsConsole-commandList-Responseactions-upload',
  scan: 'endpointResponseActionsConsole-commandList-Responseactions-scan',
};

/**
 * Page object for Response Console and Response Actions.
 */
export class ResponseActionsPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoResponseActionsHistory(): Promise<void> {
    await this.page.goto(APP_RESPONSE_ACTIONS_HISTORY_PATH);
  }

  async gotoEndpoints(): Promise<void> {
    await this.page.goto(APP_ENDPOINTS_PATH);
  }

  async waitForResponder(): Promise<void> {
    await this.page.testSubj.locator(RESPONDER_PAGE).first().waitFor({ state: 'visible' });
  }

  async closeResponder(): Promise<void> {
    await this.page.testSubj.locator('consolePageOverlay-header-back-link').first().click();
    await this.page.testSubj.locator(RESPONDER_PAGE).first().waitFor({ state: 'hidden' });
  }

  async selectCommand(command: ResponseActionCommand): Promise<void> {
    await this.page.testSubj.locator(COMMAND_TEST_SUBJ[command]).first().click();
  }

  async submitCommand(): Promise<void> {
    await this.page.testSubj.locator('endpointResponseActionsConsole-inputAreaSubmitButton').first().click();
  }

  async typeCommand(command: string): Promise<void> {
    const input = this.page.testSubj.locator('endpointResponseActionsConsole-input');
    await input.first().fill(command);
  }

  async openActionLogFlyout(): Promise<void> {
    await this.waitForResponder();
    await this.page.testSubj.locator('responderShowActionLogButton').first().click();
    await this.page.testSubj.locator(ACTION_LOG_FLYOUT).first().waitFor({ state: 'visible' });
  }
}

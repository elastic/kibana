/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@playwright/test';
import { TIMEOUTS } from '../../../../constants/timeouts';
import type { AssistantLocators } from './assistant_locators';

/**
 * Actions related to AI Assistant connector management
 *
 * This class handles selecting and creating connectors for the AI Assistant.
 */
export class ConnectorActions {
  constructor(private readonly page: ScoutPage, private readonly locators: AssistantLocators) {}

  /**
   * Selects a connector by name
   */
  async selectConnector(connectorName: string) {
    await this.locators.connectorSelector.click();
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(TIMEOUTS.UI_ELEMENT_STANDARD);

    // Use .first() to handle multiple connectors with same name (from test pollution)
    // eslint-disable-next-line playwright/no-nth-methods
    await this.locators.connectorOption(connectorName).first().click();

    // Use containText instead of exact match to handle UI variations
    await expect(this.locators.connectorSelector).toContainText(connectorName);

    // Wait for the connector configuration to be saved to the conversation
    // This ensures the apiConfig is persisted before moving to the next operation
    try {
      await this.page.waitForResponse(
        (response) =>
          response.url().includes('/internal/elastic_assistant/current_user/conversations') &&
          response.request().method() === 'PUT' &&
          response.status() === 200,
        { timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG }
      );
    } catch {
      // If the wait times out, continue anyway
      // This could happen if the conversation is new and hasn't been created yet
    }

    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(TIMEOUTS.UI_ELEMENT_STANDARD);
  }

  /**
   * Creates a new OpenAI connector through the UI
   */
  async createOpenAIConnector(connectorName: string) {
    await this.locators.openAIConnectorOption.click();
    await this.locators.connectorNameInput.fill(connectorName);
    await this.locators.secretsApiKeyInput.fill('1234');
    await this.locators.saveActionConnectorButton.click();
    await this.locators.saveActionConnectorButton.waitFor({ state: 'detached' });
  }
}

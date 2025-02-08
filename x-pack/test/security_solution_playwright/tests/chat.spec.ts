/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect } from '../fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/app/security');
});

test.describe('Chat', () => {
  test('Azure', async ({ page, connectors }) => {
    const connectorId = connectors?.find(
      (connector) => connector.connector_type_id === '.gen-ai'
    )?.id;

    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!connectorId, 'No Azure connector found');

    await page.getByTestId('assistantHeaderLink').click();
    await page.getByRole('button', { name: 'New chat' }).first().click();
    await page.getByTestId('connector-selector').click();
    await page.getByTestId(connectorId!).click();
    await page.getByTestId('prompt-textarea').click();
    await page.getByLabel('Workflow suggestions').click();
    await page.getByTestId('submit-chat').click();
    await expect(
      page.getByTestId('euiInlineReadModeButton').getByRole('heading')
    ).not.toContainText('New chat');
  });

  test('Bedrock', async ({ page, connectors }) => {
    const connectorId = connectors?.find(
      (connector) => connector.connector_type_id === '.bedrock'
    )?.id;

    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!connectorId, 'No Bedrock connector found');

    await page.getByTestId('assistantHeaderLink').click();
    await page.getByRole('button', { name: 'New chat' }).first().click();
    await page.getByTestId('connector-selector').click();
    await page.getByTestId(connectorId!).click();
    await page.getByTestId('prompt-textarea').click();
    await page.getByLabel('Workflow suggestions').click();
    await page.getByTestId('submit-chat').click();
    await expect(
      page.getByTestId('euiInlineReadModeButton').getByRole('heading')
    ).not.toContainText('New chat');
  });
});

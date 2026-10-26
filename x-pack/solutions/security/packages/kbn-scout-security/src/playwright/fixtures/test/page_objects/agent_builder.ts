/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { expect } from '../../../../../ui';

export class AgentBuilderPage {
  public conversation: Locator;
  public attachmentPillsRow: Locator;
  public inputEditor: Locator;
  public submitButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.conversation = this.page.testSubj.locator('agentBuilderConversation');
    this.attachmentPillsRow = this.page.testSubj.locator('agentBuilderAttachmentPillsRow');
    this.inputEditor = this.page.testSubj.locator('agentBuilderConversationInputEditor');
    this.submitButton = this.page.testSubj.locator('agentBuilderConversationInputSubmitButton');
  }

  /**
   * Waits for the attachment pills row to become visible. Uses a longer timeout
   * than the default because the pills row renders after the sidebar's React context
   * propagates the attachments — one extra render cycle past when the outer
   * conversation panel first becomes visible.
   */
  async waitForAttachmentPillsRow() {
    await expect(this.attachmentPillsRow).toBeVisible({ timeout: 30_000 });
  }
}

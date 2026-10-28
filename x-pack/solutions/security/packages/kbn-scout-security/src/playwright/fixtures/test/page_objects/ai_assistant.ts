/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Classic Security AI Assistant flyout, opened from the `assistantNavLink` header button.
 * Requires `aiAssistant:preferredChatExperience` set to `classic` in the space.
 */
export class AiAssistantPage {
  readonly navLink: Locator;
  readonly flyoutNavToggle: Locator;
  readonly conversationTitle: Locator;
  readonly sendToTimelineButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.navLink = this.page.testSubj.locator('assistantNavLink');
    this.flyoutNavToggle = this.page.testSubj.locator('aiAssistantFlyoutNavigationToggle');
    this.conversationTitle = this.page.testSubj.locator('conversationTitle');
    this.sendToTimelineButton = this.page.testSubj.locator('sendToTimelineEmptyButton');
  }

  conversationListItem(title: string): Locator {
    return this.page.testSubj.locator(`conversation-select-${title}`);
  }

  async open() {
    await this.navLink.click();
    await this.flyoutNavToggle.waitFor({ state: 'visible' });
  }

  /** Opens the conversation list, selects the conversation and closes the list again. */
  async selectConversation(title: string) {
    await this.flyoutNavToggle.click();
    await this.conversationListItem(title).click();
    await this.conversationTitle.filter({ hasText: title }).waitFor({ state: 'visible' });
    await this.flyoutNavToggle.click();
    await this.conversationListItem(title).waitFor({ state: 'hidden' });
  }

  async sendToTimeline() {
    await this.sendToTimelineButton.click();
  }
}

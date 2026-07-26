/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** Tutorials ("Getting started") page: topic filter and tutorial cards. */
export class VectordbTutorialsPage {
  readonly topicFilter: Locator;
  readonly tutorialCards: Locator;
  readonly generatePathCard: Locator;
  readonly storePathCard: Locator;

  constructor(private readonly page: ScoutPage) {
    this.topicFilter = page.testSubj.locator('tutorialsTopicFilter');
    this.tutorialCards = page.locator('[data-test-subj^="tutorialCard-"]');
    this.generatePathCard = page.testSubj.locator('vectordbPathSelectionGenerate');
    this.storePathCard = page.testSubj.locator('vectordbPathSelectionStore');
  }

  async goto() {
    await this.page.gotoApp('vectordb/tutorials');
  }

  tutorialCard(id: string): Locator {
    return this.page.testSubj.locator(`tutorialCard-${id}`);
  }

  /** EuiButtonGroup option; options carry labels but no per-button test subject. */
  topicFilterButton(label: string): Locator {
    return this.topicFilter.getByRole('button', { name: label });
  }
}

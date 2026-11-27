/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';

export type LogsMlPageRoute = 'anomalies' | 'log-categories';

/**
 * Shared behavior of the Logs app's ML pages (Anomalies and Categories): navigation and the
 * missing ML privileges prompts, which both pages render. Each subclass provides
 * its route and its page-specific locators.
 */
export abstract class LogsMlPage {
  protected abstract readonly route: LogsMlPageRoute;
  /** The page template's container, rendered once the app is mounted (the navigation ready gate). */
  public abstract readonly pageContainer: Locator;
  /** Shown while no ML job exists and the user can set them up. */
  public abstract readonly setupScreen: Locator;

  public readonly missingMlReadPrivilegesPrompt: Locator;
  public readonly missingMlAllPrivilegesPrompt: Locator;

  constructor(protected readonly page: ScoutPage) {
    this.missingMlReadPrivilegesPrompt = this.page.testSubj.locator('logsMissingMLReadPrivileges');
    this.missingMlAllPrivilegesPrompt = this.page.testSubj.locator('logsMissingMLAllPrivileges');
  }

  async goTo() {
    await this.page.gotoApp(`logs/${this.route}`, { readyWhen: this.pageContainer });
  }
}

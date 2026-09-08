/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_BASE_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../../../../../public/constants';

export const OBSERVABILITY_ALERTING_SURFACES = [
  { name: 'Inbox', path: OBSERVABILITY_ALERTING_INBOX_PATH, title: 'Alert episodes' },
  { name: 'Rules', path: OBSERVABILITY_ALERTING_RULES_V2_PATH, title: 'Rules' },
  { name: 'Rule library', path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH, title: 'Rule library' },
  {
    name: 'Action Policies',
    path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
    title: 'Action Policies',
  },
  {
    name: 'Execution history',
    path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
    title: 'Execution history',
  },
] as const;

const APP_ROUTE = OBSERVABILITY_ALERTING_BASE_PATH.replace(/^\/app\//, '');

/**
 * Drives the Observability Alerting mounts (`/app/observability/alerting`).
 * Does not wait for page chrome so the same `goto` works for the flag-off
 * (app-not-found) case.
 */
export class ObservabilityAlertingPage {
  public readonly pageTitle: Locator;
  public readonly appNotFoundPageContent: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageTitle = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.appNotFoundPageContent = this.page.testSubj.locator('appNotFoundPageContent');
  }

  async goto(path: string): Promise<void> {
    await this.page.gotoApp(`${APP_ROUTE}${path}`);
  }
}

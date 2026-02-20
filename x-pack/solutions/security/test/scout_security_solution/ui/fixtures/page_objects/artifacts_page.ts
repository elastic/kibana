/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import {
  APP_TRUSTED_APPS_PATH,
  APP_TRUSTED_DEVICES_PATH,
  APP_EVENT_FILTERS_PATH,
  APP_HOST_ISOLATION_EXCEPTIONS_PATH,
  APP_BLOCKLIST_PATH,
} from '../../common/defend_workflows_urls';

export type ArtifactPageId =
  | 'trustedApps'
  | 'trustedDevices'
  | 'eventFilters'
  | 'hostIsolationExceptions'
  | 'blocklist';

const ARTIFACT_PAGE_URLS: Record<ArtifactPageId, string> = {
  trustedApps: APP_TRUSTED_APPS_PATH,
  trustedDevices: APP_TRUSTED_DEVICES_PATH,
  eventFilters: APP_EVENT_FILTERS_PATH,
  hostIsolationExceptions: APP_HOST_ISOLATION_EXCEPTIONS_PATH,
  blocklist: APP_BLOCKLIST_PATH,
};

const ARTIFACT_PAGE_TEST_SUBJ_PREFIX: Record<ArtifactPageId, string> = {
  trustedApps: 'trustedAppsListPage',
  trustedDevices: 'trustedDevicesList',
  eventFilters: 'EventFiltersListPage',
  hostIsolationExceptions: 'hostIsolationExceptionsListPage',
  blocklist: 'blocklistPage',
};

/**
 * Page object for Defend Workflows artifact pages (Trusted Apps, Event Filters, Blocklist, etc.)
 */
export class ArtifactsPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(pageId: ArtifactPageId, options?: { create?: boolean; itemId?: string }): Promise<void> {
    const baseUrl = ARTIFACT_PAGE_URLS[pageId];
    if (options?.create) {
      await this.page.goto(`${baseUrl}?show=create`);
    } else if (options?.itemId) {
      await this.page.goto(`${baseUrl}?itemId=${options.itemId}&show=edit`);
    } else {
      await this.page.goto(baseUrl);
    }
  }

  async waitForPage(pageId: ArtifactPageId): Promise<void> {
    const prefix = ARTIFACT_PAGE_TEST_SUBJ_PREFIX[pageId];
    await this.page.testSubj.locator('pageContainer').first().waitFor({ state: 'visible' });
    await this.page
      .locator(`[data-test-subj="${prefix}-emptyState"], [data-test-subj="${prefix}-list"]`)
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  }

  async clickAddButton(pageId: ArtifactPageId): Promise<void> {
    const prefix = ARTIFACT_PAGE_TEST_SUBJ_PREFIX[pageId];
    const emptyAdd = this.page.testSubj.locator(`${prefix}-emptyState-addButton`);
    const pageAdd = this.page.testSubj.locator(`${prefix}-pageAddButton`);
    const addButton = (await emptyAdd.count()) > 0 ? emptyAdd : pageAdd;
    await addButton.first().click();
  }

  isShowingEmptyState(pageId: ArtifactPageId): Promise<boolean> {
    const prefix = ARTIFACT_PAGE_TEST_SUBJ_PREFIX[pageId];
    return this.page.testSubj.locator(`${prefix}-emptyState`).first().isVisible();
  }
}

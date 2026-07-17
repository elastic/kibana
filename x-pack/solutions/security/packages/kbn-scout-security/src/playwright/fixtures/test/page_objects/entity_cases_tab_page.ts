/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

// Values below mirror common/cases/attachments/entity/test_ids.ts in
// @kbn/security-solution-plugin. Cannot import directly to avoid a cross-package dependency.
// The `security.entity` attachment renders in two places inside a case:
//  - an inline card in the Activity feed (entity name from persisted metadata), and
//  - a grouped "Entities" section in the Attachments tab (entity-store backed table).
const ENTITY_NAME_TEST_ID = 'eaCasesEntityName' as const;
const ENTITY_TAB_TABLE_TEST_ID = 'eaCasesEntityTabTable' as const;

/**
 * Page object for the `security.entity` attachment as it appears inside a case view.
 *
 * Cases has no dedicated "Entities" case tab; the attachment surfaces as an inline
 * card in the default Activity feed and as a grouped section under the Attachments
 * tab. Assertions target the inline card's entity name because it renders straight
 * from the persisted attachment metadata — deterministic and independent of the
 * entity-store read privileges that gate the Attachments-tab table.
 *
 * Kept separate from {@link CasesAttachmentPage} so each class owns a single UI
 * surface and is individually reusable by other Security Solution plugins.
 */
export class EntityCasesTabPage {
  public readonly attachmentsTab: Locator;
  public readonly entityTabTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.attachmentsTab = page.testSubj.locator('case-view-tab-title-attachments');
    this.entityTabTable = page.testSubj.locator(ENTITY_TAB_TABLE_TEST_ID);
  }

  async navigateToCase(caseId: string) {
    await this.page.gotoApp(`security/cases/${caseId}`);
  }

  async openAttachmentsTab() {
    await this.attachmentsTab.click();
  }

  /**
   * The attached-entity card's name field for a given entity name, scoped to the
   * `eaCasesEntityName` test-subj. Proves the attachment persisted and rendered
   * with the expected entity — the flyout/API -> attach -> render round-trip.
   */
  entityNameCell(entityName: string): Locator {
    return this.page.testSubj.locator(ENTITY_NAME_TEST_ID).filter({ hasText: entityName });
  }
}

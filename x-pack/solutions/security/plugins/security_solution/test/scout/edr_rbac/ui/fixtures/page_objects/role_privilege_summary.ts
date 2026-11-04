/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * The privilege summary on the Stack Management role edit page.
 *
 * The summary renders sub-feature names and the selected privilege as text, with no identifier in
 * the DOM, so assertions here match on `subFeatureName` rather than a privilege id. Scoping each
 * assertion to one sub-feature keeps a failure attributable and avoids depending on the order of
 * the full list.
 */
export class RolePrivilegeSummaryPage {
  constructor(private readonly page: ScoutPage) {}

  public async gotoRole(roleName: string): Promise<void> {
    await this.page.gotoApp(`management/security/roles/edit/${roleName}`);
  }

  public async openSummary(): Promise<void> {
    await this.page.testSubj.click('viewPrivilegeSummaryButton');
  }

  /**
   * Expands every collapsed summary row. Returns the count so a caller can assert an expected
   * number rather than trusting a blanket "expand all".
   */
  public async expandAllRows(): Promise<number> {
    const rows = await this.page.testSubj.locator('expandPrivilegeSummaryRow').all();

    for (const row of rows) {
      await row.click();
    }

    return rows.length;
  }

  public spaceAvatar(spaceId: string): Locator {
    return this.page.testSubj
      .locator('privilegeSummaryFeatureCategory_securitySolution')
      .locator(`[data-test-subj="space-avatar-${spaceId}"]`);
  }

  /** The privilege shown for one sub-feature, located by its displayed name. */
  public subFeaturePrivilege(featureId: string, subFeatureName: string): Locator {
    return this.page
      .locator(`#row_${featureId}_expansion`)
      .locator('[data-test-subj="subFeatureEntry"]')
      .filter({ has: this.page.getByText(subFeatureName, { exact: true }) })
      .locator('[data-test-subj="privilegeName"]');
  }
}

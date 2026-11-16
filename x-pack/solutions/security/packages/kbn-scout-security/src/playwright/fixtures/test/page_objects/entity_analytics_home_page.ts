/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/entity_analytics_home_page';

/** The new Entity Analytics home page: its Needs attention tiles and its entities grid. */
export class EntityAnalyticsHomePage {
  public readonly root: Locator;
  public readonly grid: Locator;

  constructor(private readonly page: ScoutPage) {
    this.root = this.page.testSubj.locator('entityAnalyticsNewHomePage');
    this.grid = this.page.testSubj.locator('entityAnalyticsEntitiesGrid');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp(PAGE_URL, { readyWhen: this.root });
  }

  /** A Needs attention tile by its id, e.g. `newEntity`. */
  tile(id: string): Locator {
    return this.page.testSubj.locator(`eaFaceliftSignalCard-${id}`);
  }

  gridRow(entityName: string): Locator {
    return this.grid
      .getByRole('row')
      .filter({ has: this.page.getByText(entityName, { exact: true }) });
  }

  /** The chevron of a resolved row that has records to list; rows of one record have none. */
  expandToggle(entityName: string): Locator {
    return this.gridRow(entityName).locator('[data-test-subj="eaGridExpandToggle"]');
  }

  /** Groups the grid by a field, e.g. `entity.EngineMetadata.Type` for Entity type. */
  async groupBy(field: string): Promise<void> {
    await this.page.testSubj.click('group-selector-dropdown');
    await this.page.testSubj.click(`panel-${field}`);
  }

  /** The header of a group-by bucket, by its label. */
  groupBucket(label: string): Locator {
    return this.page.testSubj
      .locator('group-panel-toggle')
      .filter({ hasText: new RegExp(`^${label}$`, 'i') });
  }

  /** Clicks a tile and waits for it to report the new filter state. */
  async toggleTile(id: string, { selected }: { selected: boolean }): Promise<void> {
    const tile = this.tile(id);
    await tile.click();
    await tile
      .and(this.page.getByRole('button', { pressed: selected }))
      .waitFor({ state: 'visible' });
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';
import type { SignalCardId } from '../../../../../../common/entity_analytics/home/constants';

/** The new Entity Analytics home page: its Needs attention tiles and its entities grid. */
export class EntityAnalyticsHomePage {
  public readonly root: Locator;
  public readonly grid: Locator;

  constructor(private readonly page: ScoutPage) {
    this.root = this.page.testSubj.locator('entityAnalyticsNewHomePage');
    this.grid = this.page.getByRole('grid', { name: 'Entity analytics grid' });
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_home_page', { readyWhen: this.root });
  }

  tile(id: SignalCardId): Locator {
    return this.page.testSubj.locator(`eaFaceliftSignalCard-${id}`);
  }

  gridRow(entityName: string): Locator {
    return this.grid.getByRole('row').filter({ hasText: entityName });
  }

  /** Clicks a tile and waits for it to report the new filter state. */
  async toggleTile(id: SignalCardId, { selected }: { selected: boolean }): Promise<void> {
    const tile = this.tile(id);
    await tile.click();
    await tile
      .and(this.page.getByRole('button', { pressed: selected }))
      .waitFor({ state: 'visible' });
  }
}

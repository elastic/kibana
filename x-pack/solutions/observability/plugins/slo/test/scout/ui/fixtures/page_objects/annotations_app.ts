/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AppMenu, type ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

export class AnnotationsApp {
  private readonly appMenu: AppMenu;

  constructor(private readonly page: ScoutPage) {
    this.appMenu = new AppMenu(page);
  }

  async goto() {
    await this.page.gotoApp('slo', {});
    await expect(this.page.getByText('Annotations')).toBeVisible();
    await this.page.click('text=Annotations');
    await expect(this.page.getByTestId('annotationsPage')).toBeVisible();
  }

  async clickCreateAnnotation() {
    await this.appMenu.clickItem('o11yRenderToolsRightCreateAnnotationButton');
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '@kbn/test-suites-xpack-platform/functional/ftr_provider_context';
import { testSubjectIds } from '../constants/test_subject_ids';

const {
  GENERIC_ENTITY_PANEL_HEADER_TEST_ID,
  HOST_PANEL_HEADER_TEST_ID,
  USER_PANEL_HEADER_TEST_ID,
  SERVICE_PANEL_HEADER_TEST_ID,
  GROUPED_ITEM_TITLE_TEST_ID_LINK,
} = testSubjectIds;

export class EntityFlyoutPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');

  async assertEntityPanelIsOpen(
    entityType: 'generic' | 'host' | 'user' | 'service'
  ): Promise<void> {
    let testId;
    switch (entityType) {
      case 'generic':
        testId = GENERIC_ENTITY_PANEL_HEADER_TEST_ID;
        break;
      case 'host':
        testId = HOST_PANEL_HEADER_TEST_ID;
        break;
      case 'user':
        testId = USER_PANEL_HEADER_TEST_ID;
        break;
      case 'service':
        testId = SERVICE_PANEL_HEADER_TEST_ID;
        break;
    }
    await this.testSubjects.existOrFail(testId, { timeout: 10000 });
  }

  async assertEntityPanelHeader(
    entityType: 'generic' | 'host' | 'user' | 'service',
    expectedName?: string
  ): Promise<void> {
    let testId;
    switch (entityType) {
      case 'generic':
        testId = GENERIC_ENTITY_PANEL_HEADER_TEST_ID;
        break;
      case 'host':
        testId = HOST_PANEL_HEADER_TEST_ID;
        break;
      case 'user':
        testId = USER_PANEL_HEADER_TEST_ID;
        break;
      case 'service':
        testId = SERVICE_PANEL_HEADER_TEST_ID;
        break;
    }
    await this.testSubjects.existOrFail(testId, { timeout: 10000 });

    if (expectedName) {
      const headerText = await this.testSubjects.getVisibleText(testId);
      expect(headerText).to.contain(expectedName);
    }
  }

  async clickOnEntity(entityName: string): Promise<void> {
    const entities = await this.testSubjects.findAll(GROUPED_ITEM_TITLE_TEST_ID_LINK);

    for (const entityElement of entities) {
      const text = await entityElement.getVisibleText();
      if (text === entityName) {
        await entityElement.click();
        return;
      }
    }

    throw new Error(`Entity "${entityName}" not found`);
  }
}

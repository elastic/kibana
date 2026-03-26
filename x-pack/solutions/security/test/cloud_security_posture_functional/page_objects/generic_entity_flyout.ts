/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '@kbn/test-suites-xpack-platform/functional/ftr_provider_context';
import { testSubjectIds } from '../constants/test_subject_ids';

const { GENERIC_ENTITY_PANEL_HEADER_TEST_ID } = testSubjectIds;
export class GenericEntityFlyoutPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');

  async assertGenericEntityPanelIsOpen(): Promise<void> {
    await this.testSubjects.existOrFail(GENERIC_ENTITY_PANEL_HEADER_TEST_ID, { timeout: 10000 });
  }

  async assertGenericEntityPanelHeader(expectedName?: string): Promise<void> {
    await this.testSubjects.existOrFail(GENERIC_ENTITY_PANEL_HEADER_TEST_ID, { timeout: 10000 });
    if (expectedName) {
      const headerText = await this.testSubjects.getVisibleText('generic-panel-header');
      expect(headerText).to.contain(expectedName);
    }
  }
}

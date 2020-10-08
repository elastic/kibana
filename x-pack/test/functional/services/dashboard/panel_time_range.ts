/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { CommonlyUsed } from '../../../../../test/functional/page_objects/time_picker';

export function DashboardPanelTimeRangeProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');

  return new (class DashboardPanelTimeRange {
    public readonly MODAL_TEST_SUBJ = 'customizeTimeRangeModal';
    public readonly CUSTOM_TIME_RANGE_ACTION = 'CUSTOM_TIME_RANGE';

    public async clickTimeRangeActionInContextMenu() {
      log.debug('clickTimeRangeActionInContextMenu');
      await testSubjects.click('embeddablePanelAction-CUSTOM_TIME_RANGE');
    }

    public async findModal() {
      log.debug('findModal');
      return await testSubjects.find(this.MODAL_TEST_SUBJ);
    }

    public async findModalTestSubject(testSubject: string) {
      log.debug('findModalElement');
      const modal = await this.findModal();
      return await modal.findByCssSelector(`[data-test-subj="${testSubject}"]`);
    }

    public async findToggleQuickMenuButton() {
      log.debug('findToggleQuickMenuButton');
      return await this.findModalTestSubject('superDatePickerToggleQuickMenuButton');
    }

    public async clickToggleQuickMenuButton() {
      log.debug('clickToggleQuickMenuButton');
      const button = await this.findToggleQuickMenuButton();
      await button.click();
    }

    public async clickCommonlyUsedTimeRange(time: CommonlyUsed) {
      log.debug('clickCommonlyUsedTimeRange', time);
      await testSubjects.click(`superDatePickerCommonlyUsed_${time}`);
    }

    public async clickModalPrimaryButton() {
      log.debug('clickModalPrimaryButton');
      const button = await this.findModalTestSubject('addPerPanelTimeRangeButton');
      await button.click();
    }

    public async clickRemovePerPanelTimeRangeButton() {
      log.debug('clickRemovePerPanelTimeRangeButton');
      const button = await this.findModalTestSubject('removePerPanelTimeRangeButton');
      await button.click();
    }
  })();
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import { FtrProviderContext } from '../configs/ftr_provider_context';

const TEST_SUBJ = Object.freeze({
  responderPage: 'consolePageOverlay',
  actionLogFlyout: 'responderActionLogFlyout',
});

export function EndpointResponderPageObjects({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const ensureOnResponder = async () => {
    await testSubjects.existOrFail(TEST_SUBJ.responderPage);
  };

  const closeResponder = async () => {
    await ensureOnResponder();
    await testSubjects.click('consolePageOverlay-header-back-link');
    await testSubjects.missingOrFail(TEST_SUBJ.responderPage);
  };

  const openActionLogFlyout = async () => {
    await ensureOnResponder();
    await testSubjects.click('responderShowActionLogButton');
    await testSubjects.existOrFail(TEST_SUBJ.actionLogFlyout);
  };

  const closeActionLogFlyout = async () => {
    await ensureOnResponder();

    if (await testSubjects.exists(TEST_SUBJ.actionLogFlyout)) {
      await testSubjects.findService.clickByCssSelector(
        `${testSubjSelector(TEST_SUBJ.actionLogFlyout)} ${testSubjSelector('euiFlyoutCloseButton')}`
      );

      await testSubjects.missingOrFail(TEST_SUBJ.actionLogFlyout);
    }
  };

  const clickActionLogSuperDatePickerQuickMenuButton = async (): Promise<void> => {
    await testSubjects.findService.clickByCssSelector(
      `${testSubjSelector(TEST_SUBJ.actionLogFlyout)} ${testSubjSelector(
        'superDatePickerToggleQuickMenuButton'
      )}`
    );
    await testSubjects.existOrFail('superDatePickerQuickMenu');
  };

  return {
    ensureOnResponder,
    closeResponder,
    openActionLogFlyout,
    closeActionLogFlyout,
    clickActionLogSuperDatePickerQuickMenuButton,
  };
}

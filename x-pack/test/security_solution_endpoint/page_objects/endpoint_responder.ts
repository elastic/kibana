/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

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
    (await testSubjects.find('consolePageOverlay-header-back-link')).click();
    await testSubjects.missingOrFail(TEST_SUBJ.responderPage);
  };

  const openActionLogFlyout = async () => {
    await ensureOnResponder();
    await (await testSubjects.find('responderShowActionLogButton')).click();
    await testSubjects.existOrFail(TEST_SUBJ.actionLogFlyout);
  };

  const closeActionLogFlyout = async () => {
    await ensureOnResponder();

    if (await testSubjects.exists(TEST_SUBJ.actionLogFlyout)) {
      const flyout = await testSubjects.find(TEST_SUBJ.actionLogFlyout);

      await (await testSubjects.findDescendant('euiFlyoutCloseButton', flyout)).click();
      await testSubjects.missingOrFail(TEST_SUBJ.actionLogFlyout);
    }
  };

  const clickActionLogSuperDatePickerQuickMenuButton = async (): Promise<void> => {
    const actionLogFlyout = await testSubjects.find(TEST_SUBJ.actionLogFlyout);

    await (
      await testSubjects.findDescendant('superDatePickerToggleQuickMenuButton', actionLogFlyout)
    ).click();

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

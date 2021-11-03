/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

const ADD_TO_EXISTING_CASE_SELECTOR = 'add-existing-case-menu-item';
const ADD_TO_NEW_CASE_SELECTOR = 'add-new-case-item';
const CREATE_CASE_FLYOUT = 'create-case-flyout';
const SELECT_CASE_MODAL = 'all-cases-modal';

export function ObservabilityAlertsAddToCaseProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const getAddToExistingCaseSelector = async () => {
    return await testSubjects.find(ADD_TO_EXISTING_CASE_SELECTOR);
  };

  const getAddToExistingCaseSelectorOrFail = async () => {
    return await testSubjects.existOrFail(ADD_TO_EXISTING_CASE_SELECTOR);
  };

  const missingAddToExistingCaseSelectorOrFail = async () => {
    return await testSubjects.missingOrFail(ADD_TO_EXISTING_CASE_SELECTOR);
  };

  const getAddToNewCaseSelector = async () => {
    return await testSubjects.find(ADD_TO_NEW_CASE_SELECTOR);
  };

  const getAddToNewCaseSelectorOrFail = async () => {
    return await testSubjects.existOrFail(ADD_TO_NEW_CASE_SELECTOR);
  };

  const missingAddToNewCaseSelectorOrFail = async () => {
    return await testSubjects.missingOrFail(ADD_TO_NEW_CASE_SELECTOR);
  };

  const addToNewCaseButtonClick = async () => {
    return await (await getAddToNewCaseSelector()).click();
  };

  const addToExistingCaseButtonClick = async () => {
    return await (await getAddToExistingCaseSelector()).click();
  };

  const getCreateCaseFlyoutOrFail = async () => {
    return await testSubjects.existOrFail(CREATE_CASE_FLYOUT);
  };

  const closeFlyout = async () => {
    return await (await testSubjects.find('euiFlyoutCloseButton')).click();
  };

  const getAddtoExistingCaseModalOrFail = async () => {
    return await testSubjects.existOrFail(SELECT_CASE_MODAL);
  };

  return {
    getAddToExistingCaseSelector,
    getAddToExistingCaseSelectorOrFail,
    missingAddToExistingCaseSelectorOrFail,
    getAddToNewCaseSelector,
    getAddToNewCaseSelectorOrFail,
    missingAddToNewCaseSelectorOrFail,
    getCreateCaseFlyoutOrFail,
    closeFlyout,
    addToNewCaseButtonClick,
    addToExistingCaseButtonClick,
    getAddtoExistingCaseModalOrFail,
  };
}

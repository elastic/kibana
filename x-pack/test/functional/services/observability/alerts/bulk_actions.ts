/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
const CHECKBOX_SELECTOR = 'select-event';

export function ObservabilityAlertsBulkActionsProvider({ getService }: FtrProviderContext) {
  // const testSubjects = getService('testSubjects');
  const find = getService('find');

  const getCheckboxSelectorForFirstRow = async () => {
    return (await find.allByCssSelector(`[data-test-subj="${CHECKBOX_SELECTOR}"]`))[0];
  };

  const getCheckboxSelectorDisabledValue = async () => {
    return await (await getCheckboxSelectorForFirstRow()).getAttribute('disabled');
  };

  return {
    getCheckboxSelectorForFirstRow,
    getCheckboxSelectorDisabledValue,
  };
}

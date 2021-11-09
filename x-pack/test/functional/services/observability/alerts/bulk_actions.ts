/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
const CHECKBOX_SELECTOR = 'select-event';
const CHECKBOX_PRODUCER_SELECTOR = 'select-event-rule-producer-';

export function ObservabilityAlertsBulkActionsProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  const getCheckboxSelector = async () => {
    return await find.allByCssSelector(testSubjects.getCssSelector(`~${CHECKBOX_SELECTOR}`));
  };

  const missingCheckboxSelectorOrFail = async () => {
    return await testSubjects.missingOrFail(`~${CHECKBOX_SELECTOR}`);
  };

  const getCheckboxSelectorPerProducer = async (producer: string) => {
    return await find.allByCssSelector(
      testSubjects.getCssSelector(`~select-event-rule-producer-${producer}`)
    );
  };

  return {
    getCheckboxSelector,
    getCheckboxSelectorPerProducer,
    missingCheckboxSelectorOrFail,
  };
}

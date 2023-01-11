/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

const COMPACT_COMPONENT_SELECTOR = 'alertSummaryWidgetCompact';
const COMPACT_TIME_RANGE_TITLE_SELECTOR = 'timeRangeTitle';
const COMPACT_ACTIVE_ALERTS_SELECTOR = 'activeAlerts';
const COMPACT_RECOVERED_ALERTS_SELECTOR = 'recoveredAlerts';

export function ObservabilityAlertSummaryWidgetProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const getCompactComponentSelectorOrFail = async () => {
    return await testSubjects.existOrFail(COMPACT_COMPONENT_SELECTOR);
  };

  const getCompactTimeRangeTitle = async () => {
    return (await testSubjects.find(COMPACT_TIME_RANGE_TITLE_SELECTOR)).getVisibleText();
  };

  const getCompactActiveAlertSelector = async () => {
    return await testSubjects.find(COMPACT_ACTIVE_ALERTS_SELECTOR);
  };

  const getCompactRecoveredAlertSelector = async () => {
    return await testSubjects.find(COMPACT_RECOVERED_ALERTS_SELECTOR);
  };

  return {
    getCompactComponentSelectorOrFail,
    getCompactTimeRangeTitle,
    getCompactActiveAlertSelector,
    getCompactRecoveredAlertSelector,
  };
}

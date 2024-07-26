/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

const COMPACT_COMPONENT_SELECTOR = 'alertSummaryWidgetCompact';
const COMPACT_TIME_RANGE_TITLE_SELECTOR = 'timeRangeTitle';

const FULL_SIZE_COMPONENT_SELECTOR = 'alertSummaryWidgetFullSize';

const ACTIVE_ALERT_SELECTOR = 'activeAlertCount';
const TOTAL_ALERT_SELECTOR = 'totalAlertCount';

export function ObservabilityAlertSummaryWidgetProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const getCompactComponentSelectorOrFail = async () => {
    return await testSubjects.existOrFail(COMPACT_COMPONENT_SELECTOR);
  };

  const getFullSizeComponentSelectorOrFail = async () => {
    return await testSubjects.existOrFail(FULL_SIZE_COMPONENT_SELECTOR);
  };

  const getCompactTimeRangeTitle = async () => {
    return (await testSubjects.find(COMPACT_TIME_RANGE_TITLE_SELECTOR)).getVisibleText();
  };

  const getCompactWidgetSelector = async () => {
    return await testSubjects.find(COMPACT_COMPONENT_SELECTOR);
  };

  const getActiveAlertSelector = async () => {
    return await testSubjects.find(ACTIVE_ALERT_SELECTOR);
  };

  const getTotalAlertSelector = async () => {
    return await testSubjects.find(TOTAL_ALERT_SELECTOR);
  };

  const getActiveAlertCount = async () => {
    return (await getActiveAlertSelector()).getVisibleText();
  };

  const getTotalAlertCount = async () => {
    return (await getTotalAlertSelector()).getVisibleText();
  };

  return {
    getCompactComponentSelectorOrFail,
    getCompactWidgetSelector,
    getCompactTimeRangeTitle,
    getFullSizeComponentSelectorOrFail,
    getTotalAlertSelector,
    getActiveAlertSelector,
    getTotalAlertCount,
    getActiveAlertCount,
  };
}

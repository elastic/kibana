/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';

import * as i18n from './translations';

export const SUMMARY_ID = 'summary';
export const TREND_ID = 'trend';
export const COUNT_ID = 'count';
export const TREEMAP_ID = 'treemap';

export type KpiViewSelection = 'summary' | 'trend' | 'count' | 'treemap';

export const getOptionProperties = (view: KpiViewSelection): EuiButtonGroupOptionProps => {
  switch (view) {
    case SUMMARY_ID:
      return {
        id: SUMMARY_ID,
        'data-test-subj': `kpi-view-select-${SUMMARY_ID}`,
        label: i18n.SUMMARY,
        value: SUMMARY_ID,
      };
    case TREND_ID:
      return {
        id: TREND_ID,
        'data-test-subj': `kpi-view-select-${TREND_ID}`,
        label: i18n.TREND,
        value: TREND_ID,
      };
    case COUNT_ID:
      return {
        id: COUNT_ID,
        'data-test-subj': `kpi-view-select-${COUNT_ID}`,
        label: i18n.COUNT,
        value: COUNT_ID,
      };
    case TREEMAP_ID:
      return {
        id: TREEMAP_ID,
        'data-test-subj': `kpi-view-select-${TREEMAP_ID}`,
        label: i18n.TREEMAP,
        value: TREEMAP_ID,
      };
    default:
      return {
        id: SUMMARY_ID,
        'data-test-subj': `kpi-view-select-${SUMMARY_ID}`,
        label: i18n.SUMMARY,
        value: SUMMARY_ID,
      };
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';

import * as i18n from './translations';

export enum KpiViewSelection {
  Summary = 'summary',
  Trend = 'trend',
  Count = 'count',
  Treemap = 'treemap',
}

export const getOptionProperties = (view: KpiViewSelection): EuiButtonGroupOptionProps => {
  switch (view) {
    case KpiViewSelection.Summary:
      return {
        id: KpiViewSelection.Summary,
        'data-test-subj': `kpi-view-select-${KpiViewSelection.Summary}`,
        label: i18n.SUMMARY,
        value: KpiViewSelection.Summary,
      };
    case KpiViewSelection.Trend:
      return {
        id: KpiViewSelection.Trend,
        'data-test-subj': `kpi-view-select-${KpiViewSelection.Trend}`,
        label: i18n.TREND,
        value: KpiViewSelection.Trend,
      };
    case KpiViewSelection.Count:
      return {
        id: KpiViewSelection.Count,
        'data-test-subj': `kpi-view-select-${KpiViewSelection.Count}`,
        label: i18n.COUNT,
        value: KpiViewSelection.Count,
      };
    case KpiViewSelection.Treemap:
      return {
        id: KpiViewSelection.Treemap,
        'data-test-subj': `kpi-view-select-${KpiViewSelection.Treemap}`,
        label: i18n.TREEMAP,
        value: KpiViewSelection.Treemap,
      };
    default:
      return {
        id: KpiViewSelection.Summary,
        'data-test-subj': `kpi-view-select-${KpiViewSelection.Summary}`,
        label: i18n.SUMMARY,
        value: KpiViewSelection.Summary,
      };
  }
};

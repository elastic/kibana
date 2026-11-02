/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOptionProperties, KpiViewSelection } from './helpers';
import * as i18n from './translations';

describe('getOptionProperties', () => {
  it('returns correct properties for summary', () => {
    const result = getOptionProperties(KpiViewSelection.Summary);
    expect(result).toEqual({
      id: KpiViewSelection.Summary,
      'data-test-subj': `kpi-view-select-${KpiViewSelection.Summary}`,
      label: i18n.SUMMARY,
      value: KpiViewSelection.Summary,
    });
  });

  it('returns correct properties for trend', () => {
    const result = getOptionProperties(KpiViewSelection.Trend);
    expect(result).toEqual({
      id: KpiViewSelection.Trend,
      'data-test-subj': `kpi-view-select-${KpiViewSelection.Trend}`,
      label: i18n.TREND,
      value: KpiViewSelection.Trend,
    });
  });

  it('returns correct properties for count', () => {
    const result = getOptionProperties(KpiViewSelection.Count);
    expect(result).toEqual({
      id: KpiViewSelection.Count,
      'data-test-subj': `kpi-view-select-${KpiViewSelection.Count}`,
      label: i18n.COUNT,
      value: KpiViewSelection.Count,
    });
  });

  it('returns correct properties for treemap', () => {
    const result = getOptionProperties(KpiViewSelection.Treemap);
    expect(result).toEqual({
      id: KpiViewSelection.Treemap,
      'data-test-subj': `kpi-view-select-${KpiViewSelection.Treemap}`,
      label: i18n.TREEMAP,
      value: KpiViewSelection.Treemap,
    });
  });

  it('returns summary properties for unknown view (default)', () => {
    // @ts-expect-error Testing default case
    const result = getOptionProperties('unknown');
    expect(result).toEqual({
      id: KpiViewSelection.Summary,
      'data-test-subj': `kpi-view-select-${KpiViewSelection.Summary}`,
      label: i18n.SUMMARY,
      value: KpiViewSelection.Summary,
    });
  });
});

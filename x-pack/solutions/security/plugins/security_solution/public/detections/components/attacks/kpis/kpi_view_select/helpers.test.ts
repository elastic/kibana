/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOptionProperties, SUMMARY_ID, TREND_ID, COUNT_ID, TREEMAP_ID } from './helpers';
import * as i18n from './translations';

describe('getOptionProperties', () => {
  it('returns correct properties for summary', () => {
    const result = getOptionProperties('summary');
    expect(result).toEqual({
      id: SUMMARY_ID,
      'data-test-subj': `kpi-view-select-${SUMMARY_ID}`,
      label: i18n.SUMMARY,
      value: SUMMARY_ID,
    });
  });

  it('returns correct properties for trend', () => {
    const result = getOptionProperties('trend');
    expect(result).toEqual({
      id: TREND_ID,
      'data-test-subj': `kpi-view-select-${TREND_ID}`,
      label: i18n.TREND,
      value: TREND_ID,
    });
  });

  it('returns correct properties for count', () => {
    const result = getOptionProperties('count');
    expect(result).toEqual({
      id: COUNT_ID,
      'data-test-subj': `kpi-view-select-${COUNT_ID}`,
      label: i18n.COUNT,
      value: COUNT_ID,
    });
  });

  it('returns correct properties for treemap', () => {
    const result = getOptionProperties('treemap');
    expect(result).toEqual({
      id: TREEMAP_ID,
      'data-test-subj': `kpi-view-select-${TREEMAP_ID}`,
      label: i18n.TREEMAP,
      value: TREEMAP_ID,
    });
  });

  it('returns summary properties for unknown view (default)', () => {
    const result = getOptionProperties('unknown' as 'summary');
    expect(result).toEqual({
      id: SUMMARY_ID,
      'data-test-subj': `kpi-view-select-${SUMMARY_ID}`,
      label: i18n.SUMMARY,
      value: SUMMARY_ID,
    });
  });
});

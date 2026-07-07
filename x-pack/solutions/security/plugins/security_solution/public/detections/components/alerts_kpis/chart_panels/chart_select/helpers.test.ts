/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOptionProperties, TABLE_ID, TREEMAP_ID, TREND_ID, CHARTS_ID } from './helpers';
import * as i18n from './translations';

describe('helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getOptionProperties', () => {
    test('it returns the expected properties when alertViewSelection is Trend', () => {
      expect(getOptionProperties(TREND_ID)).toEqual({
        id: TREND_ID,
        'data-test-subj': `chart-select-${TREND_ID}`,
        label: i18n.TREND,
        value: TREND_ID,
      });
    });

    test('it returns the expected properties when alertViewSelection is Table', () => {
      expect(getOptionProperties(TABLE_ID)).toEqual({
        id: TABLE_ID,
        'data-test-subj': `chart-select-${TABLE_ID}`,
        label: i18n.COUNTS,
        value: TABLE_ID,
      });
    });

    test('it returns the expected properties when alertViewSelection is Treemap', () => {
      expect(getOptionProperties(TREEMAP_ID)).toEqual({
        id: TREEMAP_ID,
        'data-test-subj': `chart-select-${TREEMAP_ID}`,
        label: i18n.TREEMAP,
        value: TREEMAP_ID,
      });
    });

    test('it returns the expected properties when alertViewSelection is charts', () => {
      expect(getOptionProperties(CHARTS_ID)).toEqual({
        id: CHARTS_ID,
        'data-test-subj': `chart-select-${CHARTS_ID}`,
        label: i18n.CHARTS_TITLE,
        value: CHARTS_ID,
      });
    });
  });
});

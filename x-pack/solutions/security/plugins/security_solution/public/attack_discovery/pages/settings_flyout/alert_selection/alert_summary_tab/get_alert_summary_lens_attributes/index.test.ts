/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertSummaryLensAttributes, DEFAULT_PAGE_SIZE } from '.';
import * as i18n from '../../translations';
import type { Sorting } from '../../types';

describe('getAlertSummaryLensAttributes', () => {
  const esqlQuery = 'FROM alerts';
  const tableStackBy0 = 'kibana.alert.rule.name';
  const sorting: Sorting = { columnId: '@timestamp', direction: 'asc' };

  it("returns the expected query when tableStackBy0 is 'kibana.alert.rule.name'", () => {
    const result = getAlertSummaryLensAttributes({ esqlQuery, tableStackBy0 });

    expect(result).toEqual({
      references: [],
      state: {
        adHocDataViews: {},
        datasourceStates: {
          textBased: {
            layers: {
              '094d6c10-a28a-4780-8a0c-5789b73e4cef': {
                columns: [
                  {
                    columnId: 'tableStackBy0',
                    fieldName: 'Rule name',
                  },
                  {
                    columnId: 'count',
                    fieldName: 'Count',
                    inMetricDimension: true,
                    meta: {
                      type: 'number',
                      esType: 'long',
                    },
                  },
                ],
                index: 'F2772070-4F12-4603-A318-82F98BA69DAB',
                query: {
                  esql: esqlQuery,
                },
                timeField: '@timestamp',
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          columns: [
            {
              columnId: 'tableStackBy0',
              width: 300,
            },
            {
              columnId: 'count',
              summaryRow: 'sum',
            },
          ],
          layerId: '094d6c10-a28a-4780-8a0c-5789b73e4cef',
          layerType: 'data',
          paging: {
            enabled: true,
            size: DEFAULT_PAGE_SIZE,
          },
          sorting: {},
        },
      },
      title: i18n.ALERTS_SUMMARY,
      visualizationType: 'lnsDatatable',
    });
  });

  it("returns the expected query when tableStackBy0 is NOT 'kibana.alert.rule.name'", () => {
    const customTableStackBy0 = 'user.name';

    const result = getAlertSummaryLensAttributes({ esqlQuery, tableStackBy0: customTableStackBy0 });

    expect(
      result.state.datasourceStates.textBased?.layers['094d6c10-a28a-4780-8a0c-5789b73e4cef']
        .columns[0].fieldName
    ).toBe(customTableStackBy0);
  });

  it('returns lens attributes with a custom page size', () => {
    const customPageSize = 20;
    const result = getAlertSummaryLensAttributes({
      defaultPageSize: customPageSize,
      esqlQuery,
      tableStackBy0,
    });

    expect((result.state.visualization as { paging: { size: number } }).paging.size).toBe(
      customPageSize
    );
  });

  it('returns lens attributes with the expected sorting', () => {
    const result = getAlertSummaryLensAttributes({ esqlQuery, tableStackBy0, sorting });

    expect((result.state.visualization as { sorting: typeof sorting }).sorting).toEqual(sorting);
  });
});

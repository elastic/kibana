/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '../../../../../../common/components/visualization_actions/types';
import { getAlertsPreviewLensAttributes, DEFAULT_PAGE_SIZE } from '.';
import * as i18n from '../../translations';
import type { Sorting } from '../../types';

describe('getAlertsPreviewLensAttributes', () => {
  const esqlQuery = 'FROM alerts';
  const tableStackBy0 = 'some.field';
  const sorting: Sorting = { columnId: '@timestamp', direction: 'asc' };

  it('returns the default page size when it is NOT provided', () => {
    const result: LensAttributes = getAlertsPreviewLensAttributes({ esqlQuery, tableStackBy0 });

    expect((result.state.visualization as { paging: { size: number } }).paging.size).toBe(
      DEFAULT_PAGE_SIZE
    );
  });

  it('returns the provided page size when specified via defaultPageSize', () => {
    const customPageSize = 20;
    const result = getAlertsPreviewLensAttributes({
      esqlQuery,
      tableStackBy0,
      defaultPageSize: customPageSize,
    });

    expect((result.state.visualization as { paging: { size: number } }).paging.size).toBe(
      customPageSize
    );
  });

  it('returns the expected esqlQuery', () => {
    const result = getAlertsPreviewLensAttributes({ esqlQuery, tableStackBy0 });

    expect(
      result.state.datasourceStates.textBased?.layers?.['320760EB-4185-43EB-985B-94B9240C57E7']
        ?.query?.esql
    ).toBe(esqlQuery);
  });

  it('returns the expected columnId', () => {
    const result = getAlertsPreviewLensAttributes({ esqlQuery, tableStackBy0 });

    expect(
      result.state.datasourceStates.textBased?.layers?.['320760EB-4185-43EB-985B-94B9240C57E7']
        ?.columns[0].columnId
    ).toBe('tableStackBy0');
  });

  it('returns the expected sorting configuration', () => {
    const result = getAlertsPreviewLensAttributes({ esqlQuery, tableStackBy0, sorting });

    expect((result.state.visualization as { sorting: typeof sorting }).sorting).toEqual(sorting);
  });

  it('returns the expected title', () => {
    const result = getAlertsPreviewLensAttributes({ esqlQuery, tableStackBy0 });

    expect(result.title).toBe(i18n.ALERTS_PREVIEW);
  });

  it('returns the expected visualization type', () => {
    const result = getAlertsPreviewLensAttributes({ esqlQuery, tableStackBy0 });

    expect(result.visualizationType).toBe('lnsDatatable');
  });
});

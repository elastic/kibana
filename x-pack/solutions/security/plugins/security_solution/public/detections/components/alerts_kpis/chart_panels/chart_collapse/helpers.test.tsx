/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseChartCollapseData } from './helpers';
import * as mock from './mock_data';
import type { ChartCollapseAgg } from './types';
import type { AlertSearchResponse } from '../../../../containers/detection_engine/alerts/types';
import { getGroupByLabel } from '../../alerts_progress_bar_panel/helpers';
import * as i18n from '../../alerts_progress_bar_panel/translations';

describe('parse chart collapse data', () => {
  test('parse alerts with data', () => {
    const res = parseChartCollapseData(
      mock.mockAlertsData as AlertSearchResponse<{}, ChartCollapseAgg>
    );
    expect(res).toEqual(mock.parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseChartCollapseData(
      mock.mockAlertsEmptyData as AlertSearchResponse<{}, ChartCollapseAgg>
    );
    expect(res).toEqual([]);
  });
});

describe('get group by label', () => {
  test('should return correct label for group by selections', () => {
    expect(getGroupByLabel('host.name')).toEqual(i18n.HOST_NAME_LABEL);
    expect(getGroupByLabel('user.name')).toEqual(i18n.USER_NAME_LABEL);
    expect(getGroupByLabel('source.ip')).toEqual(i18n.SOURCE_LABEL);
    expect(getGroupByLabel('destination.ip')).toEqual(i18n.DESTINATION_LABEL);
  });
});

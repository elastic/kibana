/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAppDataView, mockDataView } from '../../rtl_helpers';
import { LensAttributes } from '../lens_attributes';
import { METRIC_SYSTEM_MEMORY_USAGE, SERVICE_NAME } from '../constants/elasticsearch_fieldnames';
import { obsvReportConfigMap } from '../../obsv_exploratory_view';
import { testMobileKPIAttr } from '../test_data/mobile_test_attribute';
import { getLayerConfigs } from '../../hooks/use_lens_attributes';
import { DataViewState } from '../../hooks/use_app_data_view';
import { ReportTypes } from '../../../../..';
import { EuiThemeComputed } from '@elastic/eui';

describe('Mobile kpi config test', function () {
  mockAppDataView();

  let lnsAttr: LensAttributes;

  const layerConfigs = getLayerConfigs(
    [
      {
        time: { from: 'now-15m', to: 'now' },
        reportDefinitions: { [SERVICE_NAME]: ['ios-integration-testing'] },
        selectedMetricField: METRIC_SYSTEM_MEMORY_USAGE,
        color: 'green',
        name: 'test-series',
        dataType: 'mobile',
      },
    ],
    ReportTypes.KPI,
    {
      colors: {
        vis: {
          euiColorVis0: '#54B399',
          euiColorVis1: '#54B399',
          euiColorVis2: '#54B399',
          euiColorVis3: '#54B399',
          euiColorVis4: '#54B399',
          euiColorVis5: '#54B399',
          euiColorVis6: '#54B399',
          euiColorVis7: '#54B399',
          euiColorVis8: '#54B399',
          euiColorVis9: '#54B399',
        },
      },
    } as unknown as EuiThemeComputed,
    { mobile: mockDataView } as DataViewState,
    obsvReportConfigMap
  );

  beforeEach(() => {
    lnsAttr = new LensAttributes(layerConfigs, ReportTypes.KPI);
  });
  it('should return expected json', function () {
    expect(lnsAttr.getJSON()).toEqual(testMobileKPIAttr);
  });
});

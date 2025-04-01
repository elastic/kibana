/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayerConfig, LensAttributes } from './lens_attributes';
import { mockAppDataView, mockDataView } from '../rtl_helpers';
import { getDefaultConfigs } from './default_configs';
import { sampleAttribute } from './test_data/sample_attribute';

import {
  LCP_FIELD,
  TRANSACTION_DURATION,
  USER_AGENT_NAME,
} from './constants/elasticsearch_fieldnames';
import { buildExistsFilter, buildPhrasesFilter } from './utils';
import { sampleAttributeKpi } from './test_data/sample_attribute_kpi';
import { RECORDS_FIELD, REPORT_METRIC_FIELD, PERCENTILE_RANKS, ReportTypes } from './constants';
import { obsvReportConfigMap } from '../obsv_exploratory_view';
import { sampleAttributeWithReferenceLines } from './test_data/sample_attribute_with_reference_lines';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { FormulaPublicApi, XYState } from '@kbn/lens-plugin/public';
import { Query } from '@kbn/es-query';

describe('Lens Attribute', () => {
  mockAppDataView();

  const reportViewConfig = getDefaultConfigs({
    reportType: 'data-distribution',
    dataType: 'ux',
    dataView: mockDataView,
    reportConfigMap: obsvReportConfigMap,
  });

  reportViewConfig.baseFilters?.push(...buildExistsFilter('transaction.type', mockDataView));

  let lnsAttr: LensAttributes;

  const layerConfig: LayerConfig = {
    seriesConfig: reportViewConfig,
    seriesType: 'line',
    operationType: 'count',
    dataView: mockDataView,
    reportDefinitions: {},
    time: { from: 'now-15m', to: 'now' },
    color: 'green',
    name: 'test-series',
    selectedMetricField: TRANSACTION_DURATION,
  };

  const lensPluginMockStart = lensPluginMock.createStartContract();

  let formulaHelper: FormulaPublicApi;

  beforeEach(async () => {
    formulaHelper = (await lensPluginMockStart.stateHelperApi()).formula;
    lnsAttr = new LensAttributes([layerConfig], reportViewConfig.reportType, formulaHelper);
  });

  it('should return expected json', function () {
    expect(lnsAttr.getJSON()).toEqual(sampleAttribute);
  });

  it('should return expected json for kpi report type', function () {
    const seriesConfigKpi = getDefaultConfigs({
      reportType: ReportTypes.KPI,
      dataType: 'ux',
      dataView: mockDataView,
      reportConfigMap: obsvReportConfigMap,
    });

    const lnsAttrKpi = new LensAttributes(
      [
        {
          seriesConfig: seriesConfigKpi,
          seriesType: 'line',
          operationType: 'count',
          dataView: mockDataView,
          reportDefinitions: { 'service.name': ['elastic-co'] },
          time: { from: 'now-15m', to: 'now' },
          color: 'green',
          name: 'test-series',
          selectedMetricField: RECORDS_FIELD,
        },
      ],
      ReportTypes.KPI
    );

    expect(lnsAttrKpi.getJSON()).toEqual(sampleAttributeKpi);
  });

  it('should return expected json for percentile breakdowns', function () {
    const seriesConfigKpi = getDefaultConfigs({
      reportType: ReportTypes.KPI,
      dataType: 'ux',
      dataView: mockDataView,
      reportConfigMap: obsvReportConfigMap,
    });

    const lnsAttrKpi = new LensAttributes(
      [
        {
          filters: [],
          seriesConfig: seriesConfigKpi,
          time: {
            from: 'now-1h',
            to: 'now',
          },
          dataView: mockDataView,
          name: 'Page load time',
          breakdown: 'percentile',
          reportDefinitions: {},
          selectedMetricField: 'transaction.duration.us',
          color: '#54b399',
        },
      ],
      ReportTypes.KPI
    );

    expect(lnsAttrKpi.getJSON().state.datasourceStates?.formBased?.layers.layer0.columns).toEqual({
      'x-axis-column-layer0': {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: {
          interval: 'auto',
          includeEmptyRows: true,
        },
        scale: 'interval',
        sourceField: '@timestamp',
      },
      ...PERCENTILE_RANKS.reduce((acc: Record<string, any>, rank, index) => {
        acc[`y-axis-column-${index === 0 ? 'layer' + index + '-0' : index}`] = {
          customLabel: true,
          dataType: 'number',
          filter: {
            language: 'kuery',
            query: 'transaction.type: page-load and processor.event: transaction',
          },
          isBucketed: false,
          label: 'Page load time',
          operationType: 'percentile',
          params: {
            percentile: Number(rank.slice(0, 2)),
          },
          scale: 'ratio',
          sourceField: 'transaction.duration.us',
        };
        return acc;
      }, {}),
    });
  });

  it('should return main y axis', function () {
    expect(lnsAttr.getMainYAxis(layerConfig, 'layer0', '')).toEqual([
      {
        customLabel: true,
        dataType: 'number',
        isBucketed: false,
        label: 'test-series',
        operationType: 'formula',
        params: {
          format: {
            id: 'percent',
            params: {
              decimals: 0,
            },
          },
          formula: 'count() / overall_sum(count())',
          isFormulaBroken: false,
        },
        references: ['y-axis-column-layer0X3'],
      },
    ]);
  });

  it('should return expected field type', function () {
    expect(JSON.stringify(lnsAttr.getFieldMeta('transaction.type', layerConfig))).toEqual(
      JSON.stringify({
        fieldMeta: {
          count: 0,
          name: 'transaction.type',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        fieldName: 'transaction.type',
      })
    );
  });

  it('should return expected field type for custom field with default value', function () {
    expect(JSON.stringify(lnsAttr.getFieldMeta(REPORT_METRIC_FIELD, layerConfig))).toEqual(
      JSON.stringify({
        fieldMeta: {
          count: 0,
          name: 'transaction.duration.us',
          type: 'number',
          esTypes: ['long'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        fieldName: 'transaction.duration.us',
        columnLabel: 'Page load time',
        showPercentileAnnotations: true,
      })
    );
  });

  it('should return expected field type for custom field with passed value', function () {
    const layerConfig1: LayerConfig = {
      seriesConfig: reportViewConfig,
      seriesType: 'line',
      operationType: 'count',
      dataView: mockDataView,
      reportDefinitions: { 'performance.metric': [LCP_FIELD] },
      time: { from: 'now-15m', to: 'now' },
      color: 'green',
      name: 'test-series',
      selectedMetricField: TRANSACTION_DURATION,
    };

    lnsAttr = new LensAttributes([layerConfig1], reportViewConfig.reportType, formulaHelper);

    expect(JSON.stringify(lnsAttr.getFieldMeta(REPORT_METRIC_FIELD, layerConfig1))).toEqual(
      JSON.stringify({
        fieldMeta: {
          count: 0,
          name: TRANSACTION_DURATION,
          type: 'number',
          esTypes: ['long'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        fieldName: TRANSACTION_DURATION,
        columnLabel: 'Page load time',
        showPercentileAnnotations: true,
      })
    );
  });

  it('should return expected number range column', function () {
    expect(lnsAttr.getNumberRangeColumn('transaction.duration.us', reportViewConfig)).toEqual({
      dataType: 'number',
      isBucketed: true,
      label: 'Page load time',
      operationType: 'range',
      params: {
        maxBars: 'auto',
        ranges: [
          {
            from: 0,
            label: '',
            to: 1000,
          },
        ],
        type: 'histogram',
      },
      scale: 'interval',
      sourceField: 'transaction.duration.us',
    });
  });

  it('should return expected number operation column', function () {
    expect(lnsAttr.getNumberRangeColumn('transaction.duration.us', reportViewConfig)).toEqual({
      dataType: 'number',
      isBucketed: true,
      label: 'Page load time',
      operationType: 'range',
      params: {
        maxBars: 'auto',
        ranges: [
          {
            from: 0,
            label: '',
            to: 1000,
          },
        ],
        type: 'histogram',
      },
      scale: 'interval',
      sourceField: 'transaction.duration.us',
    });
  });

  it('should return expected date histogram column', function () {
    expect(lnsAttr.getDateHistogramColumn('@timestamp')).toEqual({
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: {
        interval: 'auto',
        includeEmptyRows: true,
      },
      scale: 'interval',
      sourceField: '@timestamp',
    });
  });

  it('should return main x axis', function () {
    expect(lnsAttr.getXAxis(layerConfig, 'layer0')).toEqual({
      dataType: 'number',
      isBucketed: true,
      label: 'Page load time',
      operationType: 'range',
      params: {
        maxBars: 'auto',
        ranges: [
          {
            from: 0,
            label: '',
            to: 1000,
          },
        ],
        type: 'histogram',
      },
      scale: 'interval',
      sourceField: 'transaction.duration.us',
    });
  });

  it('should hide y axis when there are multiple series', function () {
    const lensAttrWithMultiSeries = new LensAttributes(
      [layerConfig, layerConfig],
      reportViewConfig.reportType,
      formulaHelper
    ).getJSON() as any;
    expect(lensAttrWithMultiSeries.state.visualization.axisTitlesVisibilitySettings).toEqual({
      x: false,
      yLeft: false,
      yRight: false,
    });
  });

  it('should show y axis when there is a single series', function () {
    const lensAttrWithMultiSeries = new LensAttributes(
      [layerConfig],
      reportViewConfig.reportType,
      formulaHelper
    ).getJSON() as any;
    expect(lensAttrWithMultiSeries.state.visualization.axisTitlesVisibilitySettings).toEqual({
      x: false,
      yLeft: true,
      yRight: true,
    });
  });

  it('should return first layer', function () {
    expect(lnsAttr.getLayers()).toEqual(sampleAttribute.state.datasourceStates.formBased.layers);
  });

  it('should return expected XYState', function () {
    expect(lnsAttr.getXyState()).toEqual({
      axisTitlesVisibilitySettings: { x: false, yLeft: true, yRight: true },
      curveType: 'CURVE_MONOTONE_X',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: { x: false, yLeft: true, yRight: true },
      layers: [
        {
          accessors: ['y-axis-column-layer0-0'],
          layerId: 'layer0',
          layerType: 'data',
          palette: undefined,
          seriesType: 'line',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [{ color: 'green', forAccessor: 'y-axis-column-layer0-0', axisMode: 'left' }],
        },
        {
          accessors: [
            '50th-percentile-reference-line-layer0-reference-lines',
            '75th-percentile-reference-line-layer0-reference-lines',
            '90th-percentile-reference-line-layer0-reference-lines',
            '95th-percentile-reference-line-layer0-reference-lines',
            '99th-percentile-reference-line-layer0-reference-lines',
          ],
          layerId: 'layer0-reference-lines',
          layerType: 'referenceLine',
          yConfig: [
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '50th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '75th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '90th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '95th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '99th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        showSingleSeries: true,
        position: 'right',
        legendSize: 'auto',
        shouldTruncate: false,
      },
      preferredSeriesType: 'line',
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      valueLabels: 'hide',
    });
  });

  it('should not use global filters when there is more than one series', function () {
    const multiSeriesLensAttr = new LensAttributes(
      [layerConfig, layerConfig],
      reportViewConfig.reportType,
      formulaHelper
    ).getJSON();
    expect((multiSeriesLensAttr.state.query as Query).query).toEqual(
      'transaction.duration.us < 60000000'
    );
  });

  describe('Layer breakdowns', function () {
    it('should return breakdown column', function () {
      const layerConfig1: LayerConfig = {
        seriesConfig: reportViewConfig,
        seriesType: 'line',
        operationType: 'count',
        dataView: mockDataView,
        reportDefinitions: { 'performance.metric': [LCP_FIELD] },
        breakdown: USER_AGENT_NAME,
        time: { from: 'now-15m', to: 'now' },
        color: 'green',
        name: 'test-series',
        selectedMetricField: LCP_FIELD,
      };

      lnsAttr = new LensAttributes([layerConfig1], reportViewConfig.reportType, formulaHelper);

      lnsAttr.getBreakdownColumn({
        layerConfig: layerConfig1,
        sourceField: USER_AGENT_NAME,
        layerId: 'layer0',
      });

      expect((lnsAttr.visualization as XYState)?.layers).toEqual([
        {
          accessors: ['y-axis-column-layer0-0'],
          layerId: 'layer0',
          layerType: 'data',
          palette: undefined,
          seriesType: 'line',
          splitAccessor: 'breakdown-column-layer0',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [{ color: 'green', forAccessor: 'y-axis-column-layer0-0', axisMode: 'left' }],
        },
      ]);

      expect(lnsAttr.layers.layer0).toEqual({
        columnOrder: [
          'breakdown-column-layer0',
          'x-axis-column-layer0',
          'y-axis-column-layer0-0',
          'y-axis-column-layer0X0',
          'y-axis-column-layer0X1',
          'y-axis-column-layer0X2',
          'y-axis-column-layer0X3',
        ],
        columns: {
          'breakdown-column-layer0': {
            dataType: 'string',
            isBucketed: true,
            label: 'Browser family',
            operationType: 'terms',
            params: {
              missingBucket: false,
              orderAgg: {
                dataType: 'number',
                isBucketed: false,
                label: 'Count of records',
                operationType: 'count',
                scale: 'ratio',
                sourceField: '___records___',
              },
              orderBy: {
                type: 'custom',
              },
              orderDirection: 'desc',
              otherBucket: true,
              size: 10,
            },
            scale: 'ordinal',
            sourceField: 'user_agent.name',
          },
          'x-axis-column-layer0': {
            dataType: 'number',
            isBucketed: true,
            label: 'Largest contentful paint',
            operationType: 'range',
            params: {
              maxBars: 'auto',
              ranges: [
                {
                  from: 0,
                  label: '',
                  to: 1000,
                },
              ],
              type: 'histogram',
            },
            scale: 'interval',
            sourceField: LCP_FIELD,
          },
          'y-axis-column-layer0-0': {
            customLabel: true,
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'test-series',
            operationType: 'formula',
            params: {
              format: {
                id: 'percent',
                params: {
                  decimals: 0,
                },
              },
              formula:
                "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
              isFormulaBroken: false,
            },
            references: ['y-axis-column-layer0X3'],
          },
          'y-axis-column-layer0X0': {
            customLabel: true,
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'Part of Pages loaded',
            operationType: 'count',
            params: {
              emptyAsNull: false,
            },
            scale: 'ratio',
            sourceField: RECORDS_FIELD,
          },
          'y-axis-column-layer0X1': {
            customLabel: true,
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'Part of Pages loaded',
            operationType: 'count',
            params: {
              emptyAsNull: false,
            },
            scale: 'ratio',
            sourceField: RECORDS_FIELD,
          },
          'y-axis-column-layer0X2': {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of Pages loaded',
            operationType: 'overall_sum',
            references: ['y-axis-column-layer0X1'],
            scale: 'ratio',
          },
          'y-axis-column-layer0X3': {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of Pages loaded',
            operationType: 'math',
            params: {
              tinymathAst: {
                args: ['y-axis-column-layer0X0', 'y-axis-column-layer0X2'],
                location: {
                  max: 212,
                  min: 0,
                },
                name: 'divide',
                text: "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
                type: 'function',
              },
            },
            references: ['y-axis-column-layer0X0', 'y-axis-column-layer0X2'],
            scale: 'ratio',
          },
        },
        incompleteColumns: {},
      });
    });
  });

  describe('Layer Filters', function () {
    it('should return expected filters', function () {
      reportViewConfig.baseFilters?.push(
        ...buildPhrasesFilter('service.name', ['elastic', 'kibana'], mockDataView)
      );

      const layerConfig1: LayerConfig = {
        seriesConfig: reportViewConfig,
        seriesType: 'line',
        operationType: 'count',
        dataView: mockDataView,
        reportDefinitions: { 'performance.metric': [LCP_FIELD] },
        time: { from: 'now-15m', to: 'now' },
        color: 'green',
        name: 'test-series',
        selectedMetricField: TRANSACTION_DURATION,
      };

      const filters = lnsAttr.getLayerFilters(layerConfig1, 2);

      expect(filters).toEqual(
        '@timestamp >= now-15m and @timestamp <= now and transaction.type: page-load and processor.event: transaction and transaction.type : * and service.name: (elastic or kibana)'
      );
    });
  });

  describe('Reference line layers', function () {
    it('should return expected reference lines', function () {
      const layerConfig1: LayerConfig = {
        seriesConfig: reportViewConfig,
        seriesType: 'line',
        dataView: mockDataView,
        reportDefinitions: {},
        time: { from: 'now-15m', to: 'now' },
        color: 'green',
        name: 'test-series',
        selectedMetricField: TRANSACTION_DURATION,
      };

      lnsAttr = new LensAttributes([layerConfig1], reportViewConfig.reportType, formulaHelper);

      const attributes = lnsAttr.getJSON();

      expect(attributes).toEqual(sampleAttributeWithReferenceLines);
    });
  });
});

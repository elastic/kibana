/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { ScaleType, AreaSeries, Axis } from '@elastic/charts';

import { AreaChartBaseComponent, AreaChartComponent } from './areachart';
import type { ChartSeriesData } from './common';

jest.mock('../../lib/kibana');
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');

  return {
    ...actual,
    AreaSeries: jest.fn(() => <div data-test-subj="area-series-mock" />),
    Axis: jest.fn(() => <div data-test-subj="axis-mock" />),
    Chart: jest.fn((props) => <div data-test-subj="chart-mock">{props.children}</div>),
    Settings: jest.fn(() => <div data-test-subj="settings-mock" />),
  };
});

const MockedAreaSeries = AreaSeries as jest.MockedFunction<typeof AreaSeries>;
const MockedAxis = Axis as jest.MockedFunction<typeof Axis>;

const customHeight = '100px';
const customWidth = '120px';
const chartDataSets = [
  [
    [
      {
        key: 'uniqueSourceIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: null },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
        ],
        color: '#D36086',
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
        ],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      {
        key: 'uniqueSourceIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1096175 },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
        ],
        color: '#D36086',
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
        ],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      {
        key: 'uniqueSourceIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: {} },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
        ],
        color: '#D36086',
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
        ],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      {
        key: 'uniqueSourceIpsHistogram',
        value: [],
        color: '#D36086',
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: [
          { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
          { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
          { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
        ],
        color: '#9170B8',
      },
    ],
  ],
];

const chartHolderDataSets = [
  [null],
  [[]],
  [
    {
      key: 'uniqueSourceIpsHistogram',
      value: null,
      color: '#D36086',
    },
    {
      key: 'uniqueDestinationIpsHistogram',
      value: null,
      color: '#9170B8',
    },
  ],
  [
    {
      key: 'uniqueSourceIpsHistogram',
      value: [
        { x: new Date('2019-05-03T13:00:00.000Z').valueOf() },
        { x: new Date('2019-05-04T01:00:00.000Z').valueOf() },
        { x: new Date('2019-05-04T13:00:00.000Z').valueOf() },
      ],
      color: '#D36086',
    },
    {
      key: 'uniqueDestinationIpsHistogram',
      value: [
        { x: new Date('2019-05-03T13:00:00.000Z').valueOf() },
        { x: new Date('2019-05-04T01:00:00.000Z').valueOf() },
        { x: new Date('2019-05-04T13:00:00.000Z').valueOf() },
      ],
      color: '#9170B8',
    },
  ],
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AreaChartBaseComponent', () => {
  const mockAreaChartData: ChartSeriesData[] = [
    {
      key: 'uniqueSourceIpsHistogram',
      value: [
        { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 580213 },
        { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1096175 },
        { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12382 },
      ],
      color: '#D36086',
    },
    {
      key: 'uniqueDestinationIpsHistogram',
      value: [
        { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
        { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
        { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
      ],
      color: '#9170B8',
    },
  ];

  it('should render Chart', () => {
    render(
      <AreaChartBaseComponent height={customHeight} width={customWidth} data={mockAreaChartData} />
    );
    expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
  });

  describe('should render with customized configs', () => {
    const mockTimeFormatter = jest.fn();
    const mockNumberFormatter = jest.fn();
    const configs = {
      series: {
        xScaleType: ScaleType.Time,
        yScaleType: ScaleType.Linear,
      },
      axis: {
        xTickFormatter: mockTimeFormatter,
        yTickFormatter: mockNumberFormatter,
      },
    };

    beforeEach(() => {
      render(
        <AreaChartBaseComponent
          height={customHeight}
          width={customWidth}
          data={mockAreaChartData}
          configs={configs}
        />
      );
    });

    it(`should render ${mockAreaChartData.length} AreaSeries`, () => {
      expect(screen.getByTestId('areaChartBaseComponent')).toMatchSnapshot();
      expect(screen.getAllByTestId('area-series-mock')).toHaveLength(mockAreaChartData.length);
    });

    it('should render AreaSeries with given xScaleType', () => {
      expect(MockedAreaSeries.mock.calls[0][0].xScaleType).toEqual(configs.series.xScaleType);
    });

    it('should render AreaSeries with given yScaleType', () => {
      expect(MockedAreaSeries.mock.calls[0][0].yScaleType).toEqual(configs.series.yScaleType);
    });

    it('should render xAxis with given tick formatter', () => {
      expect(MockedAxis.mock.calls[0][0].tickFormat).toEqual(mockTimeFormatter);
    });

    it('should render yAxis with given tick formatter', () => {
      expect(MockedAxis.mock.calls[1][0].tickFormat).toEqual(mockNumberFormatter);
    });
  });

  describe('render with default configs if no customized configs given', () => {
    beforeEach(() => {
      render(
        <AreaChartBaseComponent
          height={customHeight}
          width={customWidth}
          data={mockAreaChartData}
        />
      );
    });

    it(`should ${mockAreaChartData.length} render AreaSeries`, () => {
      expect(screen.getByTestId('areaChartBaseComponent')).toMatchSnapshot();
      expect(screen.getAllByTestId('area-series-mock')).toHaveLength(mockAreaChartData.length);
    });

    it('should render AreaSeries with default xScaleType: Linear', () => {
      expect(MockedAreaSeries.mock.calls[0][0].xScaleType).toEqual(ScaleType.Linear);
    });

    it('should render AreaSeries with default yScaleType: Linear', () => {
      expect(MockedAreaSeries.mock.calls[0][0].yScaleType).toEqual(ScaleType.Linear);
    });

    it('should not format xTicks value', () => {
      expect(MockedAxis.mock.calls[0][0].tickFormat).toBeUndefined();
    });

    it('should not format yTicks value', () => {
      expect(MockedAxis.mock.calls[1][0].tickFormat).toBeUndefined();
    });
  });

  describe('no render', () => {
    beforeEach(() => {
      render(<AreaChartBaseComponent height={null} width={null} data={mockAreaChartData} />);
    });

    it('should not render without height and width', () => {
      expect(screen.queryByTestId('area-series-mock')).not.toBeInTheDocument();
    });
  });
});

describe('AreaChartComponent', () => {
  const mockConfig = {
    series: {
      xScaleType: ScaleType.Time,
      yScaleType: ScaleType.Linear,
      stackAccessors: ['g'],
    },
    axis: {
      xTickFormatter: jest.fn(),
      yTickFormatter: jest.fn(),
      tickSize: 8,
    },
    customHeight: 324,
  };

  describe.each(chartDataSets as Array<[ChartSeriesData[]]>)('with valid data [%o]', (data) => {
    beforeEach(() => {
      render(<AreaChartComponent configs={mockConfig} areaChart={data} />);
    });

    it(`should render area chart`, () => {
      expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
      expect(screen.queryByTestId('chartHolderText')).not.toBeInTheDocument();
    });
  });

  describe.each(chartHolderDataSets as Array<[ChartSeriesData[] | null | undefined]>)(
    'with invalid data [%o]',
    (data) => {
      beforeEach(() => {
        render(<AreaChartComponent configs={mockConfig} areaChart={data} />);
      });

      it(`should render a chart place holder`, () => {
        expect(screen.queryByTestId('chart-mock')).not.toBeInTheDocument();
        expect(screen.getByTestId('chartHolderText')).toBeInTheDocument();
      });
    }
  );
});

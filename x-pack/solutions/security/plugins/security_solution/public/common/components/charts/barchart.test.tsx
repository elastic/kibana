/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxisStyle } from '@elastic/charts';
import { BarSeries, Axis, ScaleType } from '@elastic/charts';
import type { RenderResult } from '@testing-library/react';
import { screen, render } from '@testing-library/react';
import React from 'react';

import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { TestProviders } from '../../mock';
import '../../mock/react_beautiful_dnd';

import { BarChartBaseComponent, BarChartComponent } from './barchart';
import type { ChartSeriesData } from './common';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');

  return {
    ...actual,
    BarSeries: jest.fn(() => <div data-test-subj="bar-series-mock" />),
    Axis: jest.fn(() => <div data-test-subj="axis-mock" />),
    Chart: jest.fn((props) => <div data-test-subj="chart-mock">{props.children}</div>),
    Settings: jest.fn(() => <div data-test-subj="settings-mock" />),
  };
});

jest.mock('../../lib/kibana');

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

const MockedBarSeries = BarSeries as jest.MockedFunction<typeof BarSeries>;
const MockedAxis = Axis as jest.MockedFunction<typeof Axis>;

const customHeight = '100px';
const customWidth = '120px';
const chartDataSets = [
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: 'uniqueSourceIps' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: 'uniqueDestinationIps' }],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: '' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: '' }],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: 'uniqueSourceIps' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 0, x: 'uniqueDestinationIps' }],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: null, x: 'uniqueSourceIps' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: 'uniqueDestinationIps' }],
        color: '#9170B8',
      },
    ],
  ],
];

const chartHolderDataSets: Array<[ChartSeriesData[] | undefined | null]> = [
  [[]],
  [null],
  [
    [
      { key: 'uniqueSourceIps', color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{}], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{}],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 0, x: 'uniqueSourceIps' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 0, x: 'uniqueDestinationIps' }],
        color: '#9170B8',
      },
    ],
  ],
] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BarChartBaseComponent', () => {
  const mockBarChartData: ChartSeriesData[] = [
    {
      key: 'uniqueSourceIps',
      value: [{ y: 1714, x: 'uniqueSourceIps', g: 'uniqueSourceIps' }],
      color: '#D36086',
    },
    {
      key: 'uniqueDestinationIps',
      value: [{ y: 2354, x: 'uniqueDestinationIps', g: 'uniqueDestinationIps' }],
      color: '#9170B8',
    },
  ];

  describe('render', () => {
    beforeEach(() => {
      render(
        <BarChartBaseComponent height={customHeight} width={customWidth} data={mockBarChartData} />
      );
    });

    it('should render two bar series', () => {
      expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
    });
  });

  describe('render with customized configs', () => {
    const mockNumberFormatter = jest.fn();
    const mockXAxisStyle = {
      tickLine: {
        size: 0,
      },
      tickLabel: {
        padding: 16,
        fontSize: 10.5,
      },
    } as Partial<AxisStyle>;
    const mockYAxisStyle = {
      tickLine: {
        size: 0,
      },
      tickLabel: {
        padding: 16,
        fontSize: 14,
      },
    } as Partial<AxisStyle>;
    const configs = {
      series: {
        xScaleType: ScaleType.Ordinal,
        yScaleType: ScaleType.Linear,
        barSeriesStyle: {
          rect: {
            widthPixel: 22,
            opacity: 1,
          },
        },
      },
      axis: {
        yTickFormatter: mockNumberFormatter,
        bottom: {
          style: mockXAxisStyle,
        },
        left: {
          style: mockYAxisStyle,
        },
      },
    };

    beforeEach(() => {
      render(
        <BarChartBaseComponent
          height={customHeight}
          width={customWidth}
          data={mockBarChartData}
          configs={configs}
        />
      );
    });

    it(`should render ${mockBarChartData.length} BarSeries`, () => {
      expect(screen.getAllByTestId('bar-series-mock')).toHaveLength(mockBarChartData.length);
    });

    it('should render BarSeries with given xScaleType', () => {
      expect(MockedBarSeries.mock.calls[0][0].xScaleType).toEqual(configs.series.xScaleType);
    });

    it('should render BarSeries with given yScaleType', () => {
      expect(MockedBarSeries.mock.calls[0][0].yScaleType).toEqual(configs.series.yScaleType);
    });

    it('should render BarSeries with given barSeriesStyle', () => {
      expect(MockedBarSeries.mock.calls[0][0].barSeriesStyle).toEqual(
        configs.series.barSeriesStyle
      );
    });

    it('should render xAxis with given tick formatter', () => {
      expect(MockedAxis.mock.calls[0][0].tickFormat).toBeUndefined();
    });

    it('should render xAxis style', () => {
      expect(MockedAxis.mock.calls[0][0].style).toEqual(mockXAxisStyle);
    });

    it('should render yAxis with given tick formatter', () => {
      expect(MockedAxis.mock.calls[1][0].style).toEqual(mockYAxisStyle);
    });
  });

  describe('render with default configs if no customized configs given', () => {
    beforeEach(() => {
      render(
        <BarChartBaseComponent height={customHeight} width={customWidth} data={mockBarChartData} />
      );
    });

    it(`should ${mockBarChartData.length} render BarSeries`, () => {
      expect(screen.getByTestId('chart-mock')).toMatchSnapshot();
      expect(screen.getAllByTestId('bar-series-mock')).toHaveLength(mockBarChartData.length);
    });

    it('should render BarSeries with default xScaleType: Linear', () => {
      expect(MockedBarSeries.mock.calls[0][0].xScaleType).toEqual(ScaleType.Linear);
    });

    it('should render BarSeries with default yScaleType: Linear', () => {
      expect(MockedBarSeries.mock.calls[0][0].yScaleType).toEqual(ScaleType.Linear);
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
      render(<BarChartBaseComponent height={null} width={null} data={mockBarChartData} />);
    });

    it('should not render Chart without height and width', () => {
      expect(screen.queryByTestId('chart-mock')).not.toBeInTheDocument();
    });
  });
});

describe.each(chartDataSets)('BarChart with valid data [%o]', (data) => {
  beforeEach(() => {
    render(<BarChartComponent configs={mockConfig} barChart={data} />);
  });

  it(`should render chart`, () => {
    expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('chartHolderText')).not.toBeInTheDocument();
  });

  it('it does NOT render a draggable legend because stackByField is not provided', () => {
    expect(screen.queryByTestId('draggable-legend')).not.toBeInTheDocument();
  });
});

describe('BarChart with stackByField', () => {
  let wrapper: RenderResult;

  const data = [
    {
      key: 'python.exe',
      value: [
        {
          x: 1586754900000,
          y: 9675,
          g: 'python.exe',
        },
      ],
    },
    {
      key: 'kernel',
      value: [
        {
          x: 1586754900000,
          y: 8708,
          g: 'kernel',
        },
        {
          x: 1586757600000,
          y: 9282,
          g: 'kernel',
        },
      ],
    },
    {
      key: 'sshd',
      value: [
        {
          x: 1586754900000,
          y: 5907,
          g: 'sshd',
        },
      ],
    },
  ];

  const stackByField = 'process.name';

  beforeEach(() => {
    wrapper = render(
      <TestProviders>
        <BarChartComponent configs={mockConfig} barChart={data} stackByField={stackByField} />
      </TestProviders>
    );
  });

  it('it renders a draggable legend', () => {
    expect(screen.getByTestId('draggable-legend')).toBeInTheDocument();
  });

  test.each(data)('it renders the expected draggable legend text for datum $key', ({ key }) => {
    const dataProviderId = `draggableId.content.draggable-legend-item-uuid_v4()-${escapeDataProviderId(
      stackByField
    )}-${escapeDataProviderId(key)}`;

    expect(
      wrapper.container.querySelector(`div[data-provider-id="${dataProviderId}"]`)
    ).toHaveTextContent(key);
  });
});

describe('BarChart with custom color', () => {
  let wrapper: RenderResult;

  const data = [
    {
      key: 'python.exe',
      value: [
        {
          x: 1586754900000,
          y: 9675,
          g: 'python.exe',
        },
      ],
      color: '#1EA591',
    },
    {
      key: 'kernel',
      value: [
        {
          x: 1586754900000,
          y: 8708,
          g: 'kernel',
        },
        {
          x: 1586757600000,
          y: 9282,
          g: 'kernel',
        },
      ],
      color: '#000000',
    },
    {
      key: 'sshd',
      value: [
        {
          x: 1586754900000,
          y: 5907,
          g: 'sshd',
        },
      ],
      color: '#ffffff',
    },
  ];

  const expectedColors = ['#1EA591', '#000000', '#ffffff'];

  const stackByField = 'process.name';

  beforeEach(() => {
    wrapper = render(
      <TestProviders>
        <BarChartComponent configs={mockConfig} barChart={data} stackByField={stackByField} />
      </TestProviders>
    );
  });

  test.each(expectedColors)(
    'it renders the expected legend color %s for legend item $#',
    (color) => {
      expect(wrapper.container.querySelector(`div [color="${color}"]`)).toBeInTheDocument();
    }
  );
});

describe.each(chartHolderDataSets)('BarChart with invalid data [%o]', (data) => {
  let wrapper: RenderResult;

  beforeEach(() => {
    wrapper = render(<BarChartComponent configs={mockConfig} barChart={data} />);
  });

  it(`should render a ChartPlaceHolder`, () => {
    expect(wrapper.queryByTestId('chart-mock')).not.toBeInTheDocument();
    expect(wrapper.getByTestId('chartHolderText')).toBeInTheDocument();
  });
});

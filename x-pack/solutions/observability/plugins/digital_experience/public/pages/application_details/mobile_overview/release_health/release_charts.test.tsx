/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type {
  AreaSeriesProps,
  LineAnnotationProps,
  LineSeriesProps,
  SettingsProps,
} from '@elastic/charts';
import type { MobileReleaseRow, MobileReleaseSeries } from '../../../../../common/types/mobile';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { ReleaseAdoptionChart, ReleaseErrorRateChart } from './release_charts';
import { getReleaseColors } from './release_colors';
import { TEST_VIS_COLORS } from './release_colors.test_helpers';

const mockLines: LineSeriesProps[] = [];
const mockAreas: AreaSeriesProps[] = [];
const mockAnnotations: LineAnnotationProps[] = [];
const mockSettings: SettingsProps[] = [];

// jsdom draws no canvas, so the test reads the series and annotations the charts are given.
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  const { createElement } = jest.requireActual('react');
  return {
    ...actual,
    LineSeries: (props: LineSeriesProps) => {
      mockLines.push(props);
      return null;
    },
    AreaSeries: (props: AreaSeriesProps) => {
      mockAreas.push(props);
      return null;
    },
    LineAnnotation: (props: LineAnnotationProps) => {
      mockAnnotations.push(props);
      return null;
    },
    Settings: (props: SettingsProps) => {
      mockSettings.push(props);
      return createElement(actual.Settings, props);
    },
  };
});

jest.mock('../../../../hooks/use_kibana_services');

const RELEASES: MobileReleaseRow[] = [
  { release: '2.0.0', isOther: false, sessions: 300, users: 10, errorRate: 0.1 },
  { release: '1.0.0', isOther: false, sessions: 50, users: 5, errorRate: null },
  { release: '', isOther: true, sessions: 200, users: 8, errorRate: 0.2 },
];

const point = (timestamp: number) => ({ timestamp, sessions: 10, errorRate: 0.1 });

const SERIES: MobileReleaseSeries[] = RELEASES.map(({ release, isOther }) => ({
  release,
  isOther,
  points: [point(0), point(3_600_000)],
}));

const props = {
  series: SERIES,
  markers: [{ release: '2.0.0', firstSeen: 3_600_000 }],
  histogram: { interval: { value: 3600, unit: 's' as const }, start: 0, end: 7_200_000 },
  colors: getReleaseColors(RELEASES, TEST_VIS_COLORS),
  onTimeRangeSelect: jest.fn(),
};

const renderWithTheme = (ui: React.ReactElement) => render(ui, { wrapper: EuiProvider });

beforeEach(() => {
  mockLines.length = 0;
  mockAreas.length = 0;
  mockAnnotations.length = 0;
  mockSettings.length = 0;
  props.onTimeRangeSelect.mockClear();
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('release charts', () => {
  it('draws the error rate as a line per release with enough sessions, none for the others', () => {
    renderWithTheme(<ReleaseErrorRateChart releases={RELEASES} {...props} />);

    expect(mockLines.map(({ id }) => id)).toEqual(['errorRate-2.0.0', 'errorRate-']);
    expect(mockLines.map(({ name }) => name)).toEqual(['2.0.0', 'Other']);
  });

  it('stacks the sessions of every release, "Other" included, in the adoption chart', () => {
    renderWithTheme(<ReleaseAdoptionChart {...props} />);

    expect(mockAreas.map(({ id }) => id)).toEqual([
      'adoption-2.0.0',
      'adoption-1.0.0',
      'adoption-',
    ]);
    expect(mockAreas.every(({ stackAccessors }) => stackAccessors?.[0] === 'timestamp')).toBe(true);
  });

  it('marks where a release first appears in both charts, in its colour', () => {
    renderWithTheme(
      <>
        <ReleaseErrorRateChart releases={RELEASES} {...props} />
        <ReleaseAdoptionChart {...props} />
      </>
    );

    expect(mockAnnotations).toHaveLength(2);
    mockAnnotations.forEach((annotation) => {
      expect(annotation.dataValues).toEqual([{ dataValue: 3_600_000, details: '2.0.0' }]);
      expect(annotation.style?.line?.stroke).toBe(props.colors.get('2.0.0'));
    });
  });

  it('gives a release the same colour in both charts', () => {
    renderWithTheme(
      <>
        <ReleaseErrorRateChart releases={RELEASES} {...props} />
        <ReleaseAdoptionChart {...props} />
      </>
    );

    expect(mockLines[0].color).toBe(props.colors.get('2.0.0'));
    expect(mockAreas[0].color).toBe(props.colors.get('2.0.0'));
  });

  it('says so when no release has enough sessions for an error rate', () => {
    const { getByText } = renderWithTheme(
      <ReleaseErrorRateChart
        releases={RELEASES.map((release) => ({ ...release, errorRate: null }))}
        {...props}
      />
    );

    expect(
      getByText(
        'No release has enough sessions to show an error rate over time: it takes 100 sessions in the time range, and 10 in a time bucket.'
      )
    ).toBeInTheDocument();
  });

  it('says so too when releases pass the range floor but none of their buckets the bucket floor', () => {
    const { getByText } = renderWithTheme(
      <ReleaseErrorRateChart
        releases={RELEASES}
        {...props}
        series={SERIES.map((item) => ({
          ...item,
          points: item.points.map((bucket) => ({ ...bucket, errorRate: null })),
        }))}
      />
    );

    expect(mockLines).toHaveLength(0);
    expect(
      getByText(/it takes 100 sessions in the time range, and 10 in a time bucket/)
    ).toBeInTheDocument();
  });

  it('shows the legend below the plot, so it keeps its width', () => {
    renderWithTheme(<ReleaseAdoptionChart {...props} />);

    expect(mockSettings.at(-1)).toEqual(
      expect.objectContaining({ showLegend: true, legendPosition: 'bottom' })
    );
  });

  it('narrows the time range to the one dragged over a chart', () => {
    renderWithTheme(<ReleaseErrorRateChart releases={RELEASES} {...props} />);

    mockSettings.at(-1)?.onBrushEnd?.({ x: [1_000, 2_000] });

    expect(props.onTimeRangeSelect).toHaveBeenCalledWith({
      rangeFrom: new Date(1_000).toISOString(),
      rangeTo: new Date(2_000).toISOString(),
    });
  });

  it('titles each chart as a heading under the section, with its calculation in a tip', () => {
    const { getByRole } = renderWithTheme(<ReleaseAdoptionChart {...props} />);

    expect(getByRole('heading', { level: 3, name: 'Release adoption' })).toBeInTheDocument();
  });

  it('shares one marker between releases first seen in the same bucket, so labels never overlap', () => {
    const marker = (release: string, firstSeen: number) => ({ release, firstSeen });
    renderWithTheme(
      <ReleaseAdoptionChart
        {...props}
        markers={[marker('2.0.0', 3_600_000), marker('1.0.0', 3_660_000), marker('3.0.0', 0)]}
      />
    );

    expect(mockAnnotations.map(({ dataValues }) => dataValues)).toEqual([
      [{ dataValue: 0, details: '3.0.0' }],
      [{ dataValue: 3_600_000, details: '2.0.0, 1.0.0' }],
    ]);
    // In the colour of the first release of the bucket
    expect(mockAnnotations[1].style?.line?.stroke).toBe(props.colors.get('2.0.0'));
  });

  it('names the first release and how many more when a bucket has more than two', () => {
    renderWithTheme(
      <ReleaseAdoptionChart
        {...props}
        markers={['2.0.0', '1.0.0', '0.9.0'].map((release, index) => ({
          release,
          firstSeen: 3_600_000 + index,
        }))}
      />
    );

    expect(mockAnnotations[0].dataValues).toEqual([{ dataValue: 3_600_000, details: '2.0.0 +2' }]);
  });

  it("leaves room above the plot for the markers' labels", () => {
    renderWithTheme(<ReleaseAdoptionChart {...props} />);

    expect(mockSettings.at(-1)?.theme).toEqual({ chartMargins: { top: 20 } });
  });
});

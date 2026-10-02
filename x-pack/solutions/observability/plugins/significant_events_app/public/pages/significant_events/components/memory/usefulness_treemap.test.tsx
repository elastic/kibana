/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { calculateContrast, calculateLuminance, EuiProvider, hexToRgb } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import {
  CONFIDENCE_BANDS,
  formatCellLabelValue,
  MAX_TREEMAP_CELLS,
  MemoryUsefulnessTreemap,
  MIN_USEFULNESS_AREA,
  NO_LABEL_VALUE,
  toCellLabel,
  toTreemapData,
} from './usefulness_treemap';
import type { MemorySummary } from './types';

// `@elastic/charts` draws to a canvas jsdom has no layout for, so the specs are
// captured instead of rendered; the shaping of the data is tested directly.
const partitionProps = jest.fn();
const settingsProps = jest.fn();

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Chart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Settings: (props: Record<string, unknown>) => {
      settingsProps(props);
      return null;
    },
    Partition: (props: Record<string, unknown>) => {
      partitionProps(props);
      return null;
    },
    Tooltip: () => null,
  };
});

const summary = (overrides: Partial<MemorySummary> = {}): MemorySummary =>
  ({
    id: 'memory_kafka-lag',
    slug: 'kafka-lag',
    title: 'Kafka consumer lag',
    description: 'Checkout consumer lag',
    content: 'Scale the consumer.',
    tags: ['memory'],
    archived: false,
    categories: [],
    references: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: 'sre',
    updated_by: 'sre',
    telemetry: {
      impressions: 10,
      conversions: 5,
      last_impression_time: '2026-01-01T00:00:00.000Z',
    },
    usefulness: 0.5,
    confidence: 0.8,
    ...overrides,
  } as MemorySummary);

const renderTreemap = (
  pages: MemorySummary[],
  onSelectPage = jest.fn(),
  colorMode: 'light' | 'dark' = 'light'
) =>
  render(
    <EuiProvider colorMode={colorMode}>
      <I18nProvider>
        <MemoryUsefulnessTreemap pages={pages} onSelectPage={onSelectPage} />
      </I18nProvider>
    </EuiProvider>
  );

/** The colours the component actually handed to the chart, per confidence band. */
const bandColors = (): Record<string, string> => {
  const [layer] = partitionProps.mock.calls[0][0].layers as [
    { shape: { fillColor: (key: string) => string } }
  ];
  return {
    low: layer.shape.fillColor('memory_low'),
    medium: layer.shape.fillColor('memory_medium'),
    high: layer.shape.fillColor('memory_high'),
  };
};

/**
 * The chart's `fillLabel.textColor` defaults to adaptive: it picks black or white
 * per cell by contrast. Whichever it picks has to be readable on the band colour,
 * so the assertion is on the better of the two, which is the best case the chart
 * can achieve.
 */
const bestTextContrast = (fill: string): number =>
  Math.max(
    calculateContrast(hexToRgb(fill), [0, 0, 0]),
    calculateContrast(hexToRgb(fill), [255, 255, 255])
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('toTreemapData', () => {
  it('plots nothing when there is no live memory', () => {
    expect(toTreemapData([])).toEqual([]);
    expect(toTreemapData([summary({ archived: true })])).toEqual([]);
  });

  it('drops archived memories, so a retired one is never ranked against a live one', () => {
    const cells = toTreemapData([summary({ id: 'memory_old', archived: true }), summary()]);
    expect(cells.map((cell) => cell.id)).toEqual(['memory_kafka-lag']);
  });

  it('ranks by usefulness times confidence, then by how recently the memory changed', () => {
    const cells = toTreemapData([
      // Same product, so the tie-break has to be recency.
      summary({
        id: 'memory_older',
        updated_at: '2026-01-01T00:00:00.000Z',
        usefulness: 0.5,
        confidence: 0.8,
      }),
      summary({
        id: 'memory_newer',
        updated_at: '2026-03-01T00:00:00.000Z',
        usefulness: 0.5,
        confidence: 0.8,
      }),
      // The fluke quadrant: perfect usefulness, almost no evidence behind it.
      summary({ id: 'memory_fluke', usefulness: 1, confidence: 0.1 }),
      summary({ id: 'memory_proven', usefulness: 0.5, confidence: 1 }),
    ]);

    expect(cells.map((cell) => cell.id)).toEqual([
      'memory_proven',
      'memory_newer',
      'memory_older',
      'memory_fluke',
    ]);
  });

  it('caps the cells so a large store still renders a readable treemap', () => {
    const pages = Array.from({ length: MAX_TREEMAP_CELLS + 5 }, (_, index) =>
      summary({ id: `memory_${index}`, usefulness: 1, confidence: 1 })
    );
    expect(toTreemapData(pages)).toHaveLength(MAX_TREEMAP_CELLS);
  });

  it.each([
    [0, 'low'],
    [0.339, 'low'],
    [0.34, 'medium'],
    [0.669, 'medium'],
    [0.67, 'high'],
    [1, 'high'],
  ])('reads a confidence of %p as the %s band', (confidence, band) => {
    expect(toTreemapData([summary({ confidence })])[0].band).toBe(band);
  });

  it('floors the area of a never-surfaced memory without inflating what it reports', () => {
    const [cell] = toTreemapData([summary({ usefulness: 0, confidence: 0 })]);

    // 0% useful means "never shown", not "useless" — the cell is still drawn, and
    // the tooltip still says 0%.
    expect(cell.area).toBe(MIN_USEFULNESS_AREA);
    expect(cell.usefulness).toBe(0);
  });
});

describe('MemoryUsefulnessTreemap', () => {
  it('renders nothing when every memory is archived', () => {
    const { container } = renderTreemap([summary({ archived: true })]);
    expect(container).toBeEmptyDOMElement();
  });

  it('spells out all three confidence bands, so colour never carries the band alone', () => {
    renderTreemap([summary()]);

    expect(screen.getByTestId('nightshiftMemoryTreemap')).toBeInTheDocument();
    expect(screen.getByText('Low confidence (under 34%)')).toBeInTheDocument();
    expect(screen.getByText('Medium confidence (34% to 67%)')).toBeInTheDocument();
    expect(screen.getByText('High confidence (67% and above)')).toBeInTheDocument();
  });

  it('labels each cell with the memory title', () => {
    renderTreemap([summary()]);

    const [layer] = partitionProps.mock.calls[0][0].layers as [
      { nodeLabel: (key: string) => string }
    ];
    // The title plus its usefulness: the label must not report the cell's share of
    // the chart's total area, which is a different number for the same memory.
    expect(layer.nodeLabel('memory_kafka-lag')).toBe('50% · Kafka consumer lag');
  });

  it('labels a cell with the memory title and its own usefulness, never its share of the chart', () => {
    // A cell's area is its share of the chart total, which for the most useful
    // memory is a small fraction. Printing that in the cell contradicted the
    // usefulness the same memory is listed with, so the label reports usefulness.
    renderTreemap([
      summary({ id: 'memory_big', usefulness: 0.93 }),
      summary({ id: 'memory_small', usefulness: 0.04, confidence: 0.5 }),
    ]);

    const { valueFormatter, layers } = partitionProps.mock.calls[0][0] as {
      valueFormatter: (value: number) => string;
      layers: Array<{ nodeLabel: (key: string) => string }>;
    };
    const [layer] = layers;

    expect(layer.nodeLabel('memory_big')).toBe('93% · Kafka consumer lag');
    expect(layer.nodeLabel('memory_small')).toBe('4% · Kafka consumer lag');
    // The chart's own value row is emptied: it is a separate row that a clipped
    // long title evicts, which would drop the number first.
    expect(valueFormatter(0.93)).toBe('');
  });

  it('formats the cell label percentage from usefulness, not from area', () => {
    expect(formatCellLabelValue(0.93)).toBe('93%');
    expect(formatCellLabelValue(0)).toBe('0%');
    // Out of range on either side: a cell label is a bounded percentage.
    expect(formatCellLabelValue(-1)).toBe('0%');
    expect(formatCellLabelValue(1.4)).toBe('100%');
    expect(formatCellLabelValue(0.935)).toBe('94%');
  });

  it('builds a cell label from the cell it was given, and nothing for an unknown one', () => {
    const [cell] = toTreemapData([summary({ usefulness: 0.42 })]);
    expect(toCellLabel(cell)).toBe('42% · Kafka consumer lag');
    expect(toCellLabel(undefined)).toBe('');
  });

  it('leaves the chart value row empty', () => {
    expect(NO_LABEL_VALUE()).toBe('');
  });

  it('colours a cell by its confidence band', () => {
    renderTreemap([
      summary({ id: 'memory_low', confidence: 0.1 }),
      summary({ id: 'memory_medium', confidence: 0.5 }),
      summary({ id: 'memory_high', confidence: 0.9 }),
    ]);

    const colors = bandColors();
    expect(colors.low).not.toBe(colors.medium);
    expect(colors.medium).not.toBe(colors.high);
    expect(colors.low).not.toBe(colors.high);
  });

  it.each(['light', 'dark'] as const)(
    'orders the confidence bands as one hue, light to dark, in %s mode',
    (colorMode) => {
      renderTreemap(
        [
          summary({ id: 'memory_low', confidence: 0.1 }),
          summary({ id: 'memory_medium', confidence: 0.5 }),
          summary({ id: 'memory_high', confidence: 0.9 }),
        ],
        jest.fn(),
        colorMode
      );

      const { low, medium, high } = bandColors();
      const luminances = CONFIDENCE_BANDS.map((band) =>
        calculateLuminance(...hexToRgb(bandColors()[band]))
      );

      // The bands are ordinal, so the drawing has to say which is stronger: a
      // categorical palette gave three unrelated hues and no order at all.
      expect(luminances[0]).toBeGreaterThan(luminances[1]);
      expect(luminances[1]).toBeGreaterThan(luminances[2]);
      // A monotone ramp that never moves is not a scale; these must be visibly
      // distinct steps, not three shades of one value.
      for (const [lighter, darker] of [
        [luminances[0], luminances[1]],
        [luminances[1], luminances[2]],
      ]) {
        expect(lighter).toBeGreaterThan(darker * 1.1);
      }
      // One hue: the three steps differ in lightness, not in hue family, which is
      // what makes the scale read as "more" rather than "different".
      expect(hexToRgb(low)[2]).toBeGreaterThan(hexToRgb(low)[0]);
      expect(hexToRgb(medium)[2]).toBeGreaterThan(hexToRgb(medium)[0]);
      expect(hexToRgb(high)[2]).toBeGreaterThan(hexToRgb(high)[0]);
    }
  );

  it.each(['light', 'dark'] as const)(
    'keeps a cell label readable on every band in %s mode',
    (colorMode) => {
      renderTreemap(
        [
          summary({ id: 'memory_low', confidence: 0.1 }),
          summary({ id: 'memory_medium', confidence: 0.5 }),
          summary({ id: 'memory_high', confidence: 0.9 }),
        ],
        jest.fn(),
        colorMode
      );

      for (const band of CONFIDENCE_BANDS) {
        // WCAG AA for normal-size text. The chart picks whichever of black or
        // white contrasts better, so this is the contrast it will actually draw.
        expect(bestTextContrast(bandColors()[band])).toBeGreaterThanOrEqual(4.5);
      }
    }
  );

  it('sizes the cell by the floored usefulness, so a day-one memory is still visible', () => {
    renderTreemap([summary({ usefulness: 0 })]);

    const { data, valueAccessor } = partitionProps.mock.calls[0][0] as {
      data: Array<{ area: number }>;
      valueAccessor: (cell: { area: number }) => number;
    };
    expect(data[0].area).toBe(MIN_USEFULNESS_AREA);
    expect(valueAccessor(data[0])).toBe(MIN_USEFULNESS_AREA);
  });

  it('selects the memory whose cell was clicked', () => {
    const onSelectPage = jest.fn();
    renderTreemap([summary()], onSelectPage);

    const { onElementClick } = settingsProps.mock.calls[0][0] as {
      onElementClick: (elements: unknown[]) => void;
    };
    onElementClick([[{ groupByRollup: 'memory_kafka-lag' }], 'spec-1']);

    expect(onSelectPage).toHaveBeenCalledWith('memory_kafka-lag');
  });
});

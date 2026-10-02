/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { euiPaletteColorBlind } from '@elastic/eui';
import {
  MAX_TREEMAP_CELLS,
  MemoryUsefulnessTreemap,
  MIN_USEFULNESS_AREA,
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

const renderTreemap = (pages: MemorySummary[], onSelectPage = jest.fn()) =>
  render(
    <I18nProvider>
      <MemoryUsefulnessTreemap pages={pages} onSelectPage={onSelectPage} />
    </I18nProvider>
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
    expect(layer.nodeLabel('memory_kafka-lag')).toBe('Kafka consumer lag');
  });

  it('colours a cell by its confidence band', () => {
    renderTreemap([
      summary({ id: 'memory_low', confidence: 0.1 }),
      summary({ id: 'memory_high', confidence: 0.9 }),
    ]);

    const [layer] = partitionProps.mock.calls[0][0].layers as [
      { shape: { fillColor: (key: string) => string } }
    ];
    const [low, medium, high] = euiPaletteColorBlind();
    expect(layer.shape.fillColor('memory_low')).toBe(low);
    expect(layer.shape.fillColor('memory_high')).toBe(high);
    expect(medium).not.toBe(low);
  });

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SettingsProps } from '@elastic/charts';
import { calculateContrast, EuiProvider, hexToRgb } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryKeywordTreemap } from './keyword_treemap';
import type { KeywordCell } from './keyword_page_rank';
import type { MemorySummary } from './types';

// `@elastic/charts` draws to a canvas jsdom has no layout for, so the specs are
// captured instead of rendered.
const partitionProps = jest.fn();
const settingsProps = jest.fn();
const tooltipProps = jest.fn();

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
    Tooltip: (props: Record<string, unknown>) => {
      tooltipProps(props);
      return null;
    },
  };
});

const summary = (overrides: Partial<MemorySummary> = {}): MemorySummary =>
  ({
    id: 'memory_a',
    slug: 'a',
    title: 'Memory A',
    content: '',
    tags: ['memory', 'agent-builder', 'traces'],
    archived: false,
    categories: [],
    references: [],
    created_at: '',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: '',
    updated_by: '',
    telemetry: { impressions: 1, conversions: 0, last_impression_time: '' },
    usefulness: 0.9,
    confidence: 0.9,
    ...overrides,
  } as MemorySummary);

/** Three memories that give the graph a hub, a satellite, and one spelling clash. */
const PAGES = [
  summary({ id: 'memory_a', tags: ['memory', 'agent-builder', 'traces-*'] }),
  summary({ id: 'memory_b', tags: ['memory', 'agent-builder', 'Cart Cache'] }),
  summary({ id: 'memory_c', tags: ['memory', 'agent builder', 'redis'] }),
];

/**
 * The spec the component last handed the chart, narrowed to what this reads. The
 * chart types its accessors over its own datum types, which the component only
 * ever passes a `KeywordCell` to.
 */
interface PartitionSpec {
  data: KeywordCell[];
  valueAccessor: (cell: KeywordCell) => number;
  valueFormatter: (value: number) => string;
  layers: Array<{
    groupByRollup: (cell: KeywordCell) => string;
    nodeLabel: (key: string) => string;
    shape: { fillColor: unknown };
    fillLabel?: { clipText?: boolean };
  }>;
}

const partition = () => partitionProps.mock.calls[0][0] as unknown as PartitionSpec;
const layer = () => partition().layers[0];
const settings = () => settingsProps.mock.calls[0][0] as SettingsProps;
const tooltip = () =>
  tooltipProps.mock.calls[0][0] as { customTooltip: (info: unknown) => React.ReactNode };
/** The colour the layer would fill the cell named `keyword` with. */
const fillColor = (keyword: string) =>
  (layer().shape.fillColor as (key: string) => string)(keyword);

const renderTreemap = (
  props: Partial<React.ComponentProps<typeof MemoryKeywordTreemap>> = {},
  colorMode: 'light' | 'dark' = 'light'
) => {
  const onToggleKeyword = jest.fn();
  const onClearKeywords = jest.fn();
  render(
    <EuiProvider colorMode={colorMode}>
      <I18nProvider>
        <MemoryKeywordTreemap
          pages={PAGES}
          selectedKeywords={[]}
          onToggleKeyword={onToggleKeyword}
          onClearKeywords={onClearKeywords}
          {...props}
        />
      </I18nProvider>
    </EuiProvider>
  );
  return { onToggleKeyword, onClearKeywords };
};

/** The click payload the chart reports for the cell named `keyword`. */
const clickCell = (keyword: string) =>
  settings().onElementClick!([
    [{ type: 'layerValue', groupByRollup: keyword }],
  ] as unknown as Parameters<NonNullable<SettingsProps['onElementClick']>>[0]);

describe('MemoryKeywordTreemap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('draws one cell per keyword, keyed by its canonical form', () => {
    renderTreemap();

    expect(layer().groupByRollup(partition().data[0])).toBe(partition().data[0].keyword);
    // `Cart Cache` and `agent builder` fold onto the same keywords as their
    // hyphenated spellings, so the graph has five keywords, not seven.
    expect(
      partition()
        .data.map((cell) => cell.keyword)
        .sort()
    ).toEqual(['agent-builder', 'cart-cache', 'redis', 'traces-*']);
    expect(layer().nodeLabel!('agent-builder')).toBe('agent-builder');
    expect(layer().nodeLabel!('cart-cache')).toBe('Cart Cache');
  });

  it('labels a cell with the keyword alone and leaves the chart value slot empty', () => {
    renderTreemap();

    const cell = partition().data[0];
    // The score rides in the tooltip: the chart's own value row is one a clipped
    // keyword evicts, so it is emptied rather than filled.
    expect(layer().nodeLabel!(cell.keyword)).not.toContain('%');
    expect(partition().valueFormatter!(cell.area)).toBe('');
    expect(partition().valueAccessor!(cell)).toBe(cell.area);
  });

  it('fills the cells from the colour-blind palette in rank order', () => {
    renderTreemap();

    const fills = partition().data.map((cell) => fillColor(cell.keyword));
    expect(new Set(fills).size).toBe(fills.length);
    expect(fills.every((fill) => /^#|rgb/.test(fill))).toBe(true);
  });

  it('reports the keyword, its score, and how many memories carry it', () => {
    renderTreemap();

    const { container } = render(
      <I18nProvider>
        {tooltip().customTooltip({
          values: [
            {
              seriesIdentifier: { key: 'agent-builder', specId: 'x', dataType: 'explicit' },
            },
          ],
        })}
      </I18nProvider>
    );
    expect(container.textContent).toContain('agent-builder');
    expect(container.textContent).toMatch(/Score \d+%/);
    // Three of the three fixture memories carry it, whichever spelling they used.
    expect(container.textContent).toContain('3 memories');
  });

  it('toggles a keyword into the selection when its cell is clicked', () => {
    const { onToggleKeyword } = renderTreemap();

    clickCell('agent-builder');

    expect(onToggleKeyword).toHaveBeenCalledWith('agent-builder');
  });

  it('leaves a click that landed on no cell to the caller', () => {
    const { onToggleKeyword } = renderTreemap();

    settings().onElementClick!([[{ type: 'primitive' }]] as unknown as Parameters<
      NonNullable<SettingsProps['onElementClick']>
    >[0]);

    expect(onToggleKeyword).not.toHaveBeenCalled();
  });

  it('names the filter in a chip row, and removes a keyword when its chip is clicked', async () => {
    const { onToggleKeyword } = renderTreemap({ selectedKeywords: ['cart-cache'] });

    expect(screen.getByTestId('nightshiftMemoryKeywordFilters')).toBeInTheDocument();
    // A selected keyword is out of the chart, so the chip carries its spelling.
    const chip = screen.getByTestId('nightshiftMemoryKeywordChip-cart-cache');
    expect(chip).toHaveTextContent('Cart Cache');

    await userEvent.click(chip);
    expect(onToggleKeyword).toHaveBeenCalledWith('cart-cache');
  });

  it('drops selected keywords from the cells rather than restyling them', () => {
    renderTreemap({ selectedKeywords: ['agent-builder'] });

    const keywords = partition().data.map((cell) => cell.keyword);
    expect(keywords).not.toContain('agent-builder');
  });

  it('clears every keyword at once', async () => {
    const { onClearKeywords } = renderTreemap({ selectedKeywords: ['agent-builder', 'redis'] });

    await userEvent.click(screen.getByTestId('nightshiftMemoryClearKeywords'));

    expect(onClearKeywords).toHaveBeenCalled();
  });

  it('shows no chip row until something is selected', () => {
    renderTreemap();

    expect(screen.queryByTestId('nightshiftMemoryKeywordFilters')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftMemoryClearKeywords')).not.toBeInTheDocument();
  });

  it('says so when the selected memories have no keywords to rank', () => {
    renderTreemap({ pages: [summary({ tags: ['memory'] })], selectedKeywords: ['kafka'] });

    expect(screen.getByTestId('nightshiftMemoryTreemapEmpty')).toBeInTheDocument();
  });

  /**
   * `clipText` cannot be left on for a single cell.
   *
   * The chart builds the fill label's clip out of the canvas path its previous
   * draw left behind (the cell rectangles, which a save/restore does not cover),
   * and one cell's own rectangle winds against the clip rectangle: the label is
   * laid out, painted, and then clipped away entirely. Dropping `clipText` takes
   * the chart out of that path, and with one cell the label is laid out inside
   * the whole panel either way.
   */
  it('asks the chart not to clip when a single keyword is left', () => {
    renderTreemap({ pages: [summary({ tags: ['memory', 'agent-builder'] })] });

    expect(partition().data).toHaveLength(1);
    expect(layer().fillLabel!.clipText).toBe(false);
  });

  it('still clips a multi-cell chart, where a long keyword would overrun its cell', () => {
    renderTreemap();

    expect(partition().data.length).toBeGreaterThan(1);
    expect(layer().fillLabel!.clipText).toBe(true);
  });

  /**
   * The chip's remove icon is the one thing standing between a filter and the
   * person who wants it gone, so it cannot wait on `EuiIcon`'s on-demand import
   * of a string icon type — that is a render with no visible affordance.
   */
  it('draws the chip remove icon without waiting on an icon chunk', () => {
    renderTreemap({ selectedKeywords: ['cart-cache'] });

    // `EuiIcon` renders a string type only once it has imported that icon's
    // asset, so the badge is handed the component instead. Kibana's Jest maps
    // `@elastic/eui` to `test-env`, where an icon is a span named after the type
    // it was given: a component here, the string `cross` there.
    const remove = screen.getByRole('button', { name: 'Remove the cart-cache filter' });
    expect(remove).toContainHTML('data-euiicon-type="CrossIcon"');
  });

  it('takes no room at all when the store has no live memories', () => {
    renderTreemap({ pages: [] });

    expect(screen.queryByTestId('nightshiftMemoryTreemap')).not.toBeInTheDocument();
  });

  /**
   * The chart's `fillLabel.textColor` is left at `Adaptive`, which picks black or
   * white per cell by WCAG2 contrast against the fill. That is only safe if every
   * palette colour has one of the two at a readable ratio, so this asserts it
   * rather than trusting it — and pins the palette to 10 colours, because a
   * forty-cell chart cycles through them.
   */
  it.each(['light', 'dark'] as const)(
    'has a readable label colour on every palette colour in %s mode',
    (colorMode) => {
      renderTreemap({}, colorMode);
      const fills = new Set(partition().data.map((cell) => fillColor(cell.keyword)));

      fills.forEach((fill) => {
        const onBlack = calculateContrast(hexToRgb(fill) as never, [0, 0, 0]);
        const onWhite = calculateContrast(hexToRgb(fill) as never, [255, 255, 255]);
        // Whichever `Adaptive` picks has to clear WCAG AA for the 10-14px labels.
        expect(Math.max(onBlack, onWhite)).toBeGreaterThanOrEqual(4.5);
      });
    }
  );

  it('cycles a fixed number of colours, so the palette is what the contrast check covers', () => {
    const wide = Array.from({ length: 60 }, (_, index) =>
      summary({ id: `memory_${index}`, tags: ['memory', `topic-${index}`, `agent-${index}`] })
    );
    renderTreemap({ pages: wide });
    const fills = partition().data.map((cell) => fillColor(cell.keyword));

    expect(new Set(fills).size).toBeLessThanOrEqual(10);
  });
});

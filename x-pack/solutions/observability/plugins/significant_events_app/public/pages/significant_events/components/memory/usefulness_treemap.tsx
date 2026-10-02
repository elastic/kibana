/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElementClickListener, LayerValue, TooltipInfo } from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings, Tooltip } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiPaletteCool,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import React, { useCallback, useMemo } from 'react';
import type { MemorySummary } from './types';

/**
 * How much the bandit maths backs a memory up, in three steps.
 *
 * A memory surfaced once and marked useful has a rate of 1.0 and a confidence
 * near zero, which is why confidence is a band and not a fourth dimension: the
 * "large cell, pale colour" quadrant is the story the chart exists to tell.
 */
export type ConfidenceBand = 'low' | 'medium' | 'high';

export const CONFIDENCE_BANDS: readonly ConfidenceBand[] = ['low', 'medium', 'high'];

/** A band is `low` below `medium`, `medium` below `high`, and `high` above. */
export const BAND_FLOORS = { medium: 0.34, high: 0.67 } as const;

/**
 * Smallest area a memory is drawn with.
 *
 * A memory that has never been surfaced is 0% useful, which would leave it with
 * no cell at all on day one. The floor keeps it visible without pretending it
 * proved anything: the tooltip and the ranking still report the real 0%.
 */
export const MIN_USEFULNESS_AREA = 0.02;

/** Past this the cells stop being readable, and a treemap that big says nothing. */
export const MAX_TREEMAP_CELLS = 40;

export interface TreemapCell {
  id: string;
  title: string;
  band: ConfidenceBand;
  /** Real usefulness in [0, 1]: what the tooltip reports and what ranking uses. */
  usefulness: number;
  confidence: number;
  /** What the partition sizes by — usefulness, floored so a 0% memory still has a cell. */
  area: number;
}

const asUnit = (value: number): number => Math.max(0, Math.min(1, value));

export const toConfidenceBand = (confidence: number): ConfidenceBand =>
  confidence < BAND_FLOORS.medium ? 'low' : confidence < BAND_FLOORS.high ? 'medium' : 'high';

/**
 * Shapes the treemap's rows: live memories only, ranked and capped.
 *
 * Archived memories are dropped here as well as by the `active` filter on the
 * query, so a caller that already holds an unfiltered list cannot plot a
 * retired memory against the live ones.
 */
export const toTreemapData = (pages: MemorySummary[]): TreemapCell[] =>
  pages
    .filter((page) => !page.archived)
    .sort(
      (a, b) =>
        b.usefulness * b.confidence - a.usefulness * a.confidence ||
        b.updated_at.localeCompare(a.updated_at)
    )
    .slice(0, MAX_TREEMAP_CELLS)
    .map((page) => {
      const usefulness = asUnit(page.usefulness);
      const confidence = asUnit(page.confidence);
      return {
        id: page.id,
        title: page.title,
        band: toConfidenceBand(confidence),
        usefulness,
        confidence,
        area: Math.max(usefulness, MIN_USEFULNESS_AREA),
      };
    });

const asPercent = (value: number): number => Math.round(value * 100);

/** Renders a cell label's usefulness as a whole percentage. */
export const formatCellLabelValue = (usefulness: number): string =>
  `${asPercent(asUnit(usefulness))}%`;

/**
 * The text a cell writes in its own label: its title and its usefulness.
 *
 * The chart's default value getter is a fraction of the *total chart area*, which
 * beside the ranking list reads as "8% useful" for a memory the list calls 93%
 * useful — two different numbers for one memory. Area share carries no meaning of
 * its own here, so the label reports usefulness and the tooltip reports both.
 *
 * The percentage rides in the label text rather than the chart's separate value
 * slot, because that slot is a row of its own which a clipped long title evicts:
 * the number a cell exists to show would be the first thing dropped.
 */
export const toCellLabel = (cell: TreemapCell | undefined): string => {
  if (!cell) return '';
  // The percentage leads, because the chart clips a label that overflows its cell
  // from the end: trailing it would drop the number off exactly the small cells
  // whose usefulness is the thing worth reading.
  return `${formatCellLabelValue(cell.usefulness)} · ${cell.title}`;
};

/**
 * The chart's value slot, emptied.
 *
 * An empty string drops the row the chart would otherwise append after the label;
 * `toCellLabel` carries the percentage instead.
 */
export const NO_LABEL_VALUE = (): string => '';

const isLayerValue = (value: unknown): value is LayerValue =>
  typeof value === 'object' && value !== null && 'groupByRollup' in value;

/** The cell a click landed on. The partition reports one layer value per click. */
const clickedCellId = (elements: Parameters<ElementClickListener>[0]): string | undefined => {
  const [layer] = elements.flat(2).filter(isLayerValue);
  return layer === undefined ? undefined : `${layer.groupByRollup}`;
};

/**
 * The tooltip reports the real numbers. The partition only hands it the
 * aggregate and the rollup key, so the cell is recovered from the rollup.
 */
const tooltipCell = (
  values: TooltipInfo['values'],
  cellsById: Map<string, TreemapCell>
): TreemapCell | undefined =>
  values
    .map(({ seriesIdentifier }) => cellsById.get(seriesIdentifier.key))
    .find((c) => c !== undefined);

interface MemoryUsefulnessTreemapProps {
  pages: MemorySummary[];
  onSelectPage: (id: string) => void;
}

export function MemoryUsefulnessTreemap({ pages, onSelectPage }: MemoryUsefulnessTreemapProps) {
  const cells = useMemo(() => toTreemapData(pages), [pages]);
  const cellsById = useMemo(() => new Map(cells.map((cell) => [cell.id, cell])), [cells]);
  // The three bands are ordinal, so they get a sequential scale: one hue, light to
  // dark, low to high. The colour-blind palette is categorical — its first three
  // entries are three unrelated hues, so nothing in the drawing said which band was
  // stronger. `useEuiPaletteCool` also re-derives on a theme change, where reading
  // `EUI_VIS_COLOR_STORE` once at mount froze the light-theme colours into dark mode.
  //
  // The chart's own `fillLabel.textColor` is left at its default adaptive value,
  // which picks black or white per cell; on this scale that resolves to black on
  // all three steps in both themes (8:1 or better), so the labels stay readable.
  const bandPalette = useEuiPaletteCool(CONFIDENCE_BANDS.length);
  const colors = useMemo<Record<ConfidenceBand, string>>(() => {
    const [low = '', medium = '', high = ''] = CONFIDENCE_BANDS.map(
      (_, index) => bandPalette[index]
    );
    return { low, medium, high };
  }, [bandPalette]);
  const chartBaseTheme = useElasticChartsTheme();

  const onElementClick = useCallback<ElementClickListener>(
    (elements) => {
      const id = clickedCellId(elements);
      if (id !== undefined) onSelectPage(id);
    },
    [onSelectPage]
  );

  const renderTooltip = useCallback(
    ({ values }: TooltipInfo) => {
      const cell = tooltipCell(values, cellsById);
      if (cell === undefined) return null;
      return (
        <div data-test-subj="nightshiftMemoryTreemapTooltip">
          <EuiText size="s">
            <strong>{cell.title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.treemap.usefulnessValue"
              defaultMessage="Usefulness {usefulness}%"
              values={{ usefulness: asPercent(cell.usefulness) }}
            />
            {' · '}
            <FormattedMessage
              id="xpack.significantEventsApp.memory.treemap.confidenceValue"
              defaultMessage="Confidence {confidence}%"
              values={{ confidence: asPercent(cell.confidence) }}
            />
          </EuiText>
        </div>
      );
    },
    [cellsById]
  );

  // A store with no live memories has nothing to plot, and an empty chart frame
  // would only take room the memory list needs.
  if (cells.length === 0) return null;

  return (
    <div data-test-subj="nightshiftMemoryTreemap">
      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="xpack.significantEventsApp.memory.treemap.title"
            defaultMessage="Usefulness by confidence"
          />
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.significantEventsApp.memory.treemap.caption"
            defaultMessage="Cell area and label are usefulness; cell colour is confidence."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <Chart size={{ width: '100%', height: 240 }}>
        <Settings
          baseTheme={chartBaseTheme}
          // The chart's own legend would list every memory; the band legend below
          // is the only one that carries meaning here.
          showLegend={false}
          onElementClick={onElementClick}
        />
        <Partition
          data={cells}
          id="nightshift_memory_usefulness_treemap"
          valueAccessor={(cell) => cell.area}
          // Area still drives the geometry. The label value itself is empty on
          // purpose: the chart appends the value as a separate row that `clipText`
          // then cuts off a long title to make room for, so the number a cell was
          // meant to show is the first thing to disappear. The percentage rides in
          // `nodeLabel` instead, where it wraps with the title it belongs to.
          valueFormatter={NO_LABEL_VALUE}
          layout={PartitionLayout.treemap}
          layers={[
            {
              // One node per memory: grouping by title would merge two memories
              // that happen to share one, and the click would be ambiguous.
              groupByRollup: (cell: TreemapCell) => cell.id,
              shape: { fillColor: (key) => colors[cellsById.get(key)?.band ?? 'low'] },
              // `clipText` keeps a long title inside its own cell. Without it the
              // label runs over the neighbouring cells, so a small cell's title
              // reads as if it belonged to the cell beside it.
              fillLabel: { clipText: true, fontWeight: 500, minFontSize: 10, maxFontSize: 14 },
              nodeLabel: (key) => toCellLabel(cellsById.get(`${key}`)),
            },
          ]}
        />
        <Tooltip customTooltip={renderTooltip} />
      </Chart>
      <EuiSpacer size="s" />
      <ConfidenceBandLegend colors={colors} />
    </div>
  );
}

/**
 * Colour never carries a band on its own: every cell also names its numbers in
 * the tooltip, and the three bands are spelled out here.
 */
function ConfidenceBandLegend({ colors }: { colors: Record<ConfidenceBand, string> }) {
  return (
    <EuiFlexGroup
      gutterSize="m"
      responsive={false}
      alignItems="center"
      wrap
      data-test-subj="nightshiftMemoryTreemapLegend"
    >
      <EuiFlexItem grow={false}>
        <BandEntry band="low" color={colors.low} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <BandEntry band="medium" color={colors.medium} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <BandEntry band="high" color={colors.high} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function BandEntry({ band, color }: { band: ConfidenceBand; color: string }) {
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        {/* A painted swatch, not just the band's name: the legend exists to tie a
            colour to a band, and text alone ties nothing. `className` with
            `@emotion/css` rather than the `css` prop, which only reaches the DOM
            through the JSX runtime's pragma and would otherwise emit nothing. */}
        <span
          aria-hidden="true"
          data-test-subj={`nightshiftMemoryTreemapLegend-${band}`}
          className={css`
            background-color: ${color};
            border-radius: 2px;
            display: block;
            flex-shrink: 0;
            height: 10px;
            width: 10px;
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {band === 'low' && (
            <FormattedMessage
              id="xpack.significantEventsApp.memory.treemap.band.low"
              defaultMessage="Low confidence (under {threshold}%)"
              values={{ threshold: asPercent(BAND_FLOORS.medium) }}
            />
          )}
          {band === 'medium' && (
            <FormattedMessage
              id="xpack.significantEventsApp.memory.treemap.band.medium"
              defaultMessage="Medium confidence ({low}% to {high}%)"
              values={{
                low: asPercent(BAND_FLOORS.medium),
                high: asPercent(BAND_FLOORS.high),
              }}
            />
          )}
          {band === 'high' && (
            <FormattedMessage
              id="xpack.significantEventsApp.memory.treemap.band.high"
              defaultMessage="High confidence ({threshold}% and above)"
              values={{ threshold: asPercent(BAND_FLOORS.high) }}
            />
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElementClickListener, LayerValue, TooltipInfo } from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings, Tooltip } from '@elastic/charts';
import { percentValueGetter } from '@elastic/charts/dist/chart_types/partition_chart/layout/config';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
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
  const colors = useMemo<Record<ConfidenceBand, string>>(() => {
    const palette = euiPaletteColorBlind();
    const [low = '', medium = '', high = ''] = CONFIDENCE_BANDS.map((_, index) => palette[index]);
    return { low, medium, high };
  }, []);
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
            defaultMessage="Cell area is usefulness; cell colour is confidence."
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
          valueGetter={percentValueGetter}
          layout={PartitionLayout.treemap}
          layers={[
            {
              // One node per memory: grouping by title would merge two memories
              // that happen to share one, and the click would be ambiguous.
              groupByRollup: (cell: TreemapCell) => cell.id,
              shape: { fillColor: (key) => colors[cellsById.get(key)?.band ?? 'low'] },
              fillLabel: { fontWeight: 500, minFontSize: 10, maxFontSize: 14 },
              nodeLabel: (key) => cellsById.get(`${key}`)?.title ?? `${key}`,
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
        <span
          aria-hidden="true"
          data-test-subj={`nightshiftMemoryTreemapLegend-${band}`}
          css={css({
            backgroundColor: color,
            borderRadius: 2,
            display: 'block',
            height: 10,
            width: 10,
          })}
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

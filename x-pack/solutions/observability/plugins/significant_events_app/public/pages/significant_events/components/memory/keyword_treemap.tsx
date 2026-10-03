/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElementClickListener,
  LayerValue,
  PartitionFillLabel,
  PartitionLayer,
  TooltipInfo,
} from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings, Tooltip } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiPaletteColorBlindBehindText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import {
  toKeywordCells,
  toKeywordDisplayNames,
  type KeywordCell,
  type KeywordEntry,
} from './keyword_page_rank';
import type { MemorySummary } from './types';

/**
 * The keyword treemap: what the store is mostly about, ranked by PageRank.
 *
 * Cell area is the keyword's normalized PageRank, so a big cell is a keyword
 * that ties many memories together rather than one that merely repeats often.
 * Clicking a cell filters the view by that keyword.
 */

/**
 * The chart's value slot, emptied.
 *
 * The chart appends the value as its own row, which a long keyword evicts when
 * the label is clipped; the percentage belongs in the tooltip instead.
 */
const NO_LABEL_VALUE = (): string => '';

const asPercent = (value: number): number => Math.round(value * 100);

const isLayerValue = (value: unknown): value is LayerValue =>
  typeof value === 'object' && value !== null && 'groupByRollup' in value;

/** The keyword a click landed on. The partition reports one layer value per click. */
const clickedKeyword = (elements: Parameters<ElementClickListener>[0]): string | undefined => {
  const [layer] = elements.flat(2).filter(isLayerValue);
  return layer === undefined ? undefined : `${layer.groupByRollup}`;
};

/**
 * Where a cell's label sits inside it, from elastic/elastic-charts#2912.
 *
 * The pinned 73.2.2 chart has no such control and drops the keys it does not
 * know, so this is inert today — the label stays top-left — and centers the
 * label the moment Kibana's `@elastic/charts` carries #2912.
 */
interface FillLabelAlignment {
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  horizontalAlignment?: 'left' | 'center' | 'right';
}

/** The layer's own fill label type, widened with the alignment keys above. */
type LayerFillLabel = NonNullable<PartitionLayer['fillLabel']> & FillLabelAlignment;

/** Delete this alias once `@elastic/charts` carries elastic-charts#2912. */
type ChartsStillLacksFillLabelAlignment = 'verticalAlignment' extends keyof PartitionFillLabel
  ? never
  : true;
const SHIM_NEEDED: ChartsStillLacksFillLabelAlignment = true;
void SHIM_NEEDED;

/**
 * The tooltip reports the numbers the cell label leaves out: the keyword's share
 * of the ranking and how many memories carry it.
 */
const tooltipCell = (
  values: TooltipInfo['values'],
  cellsByKeyword: Map<string, KeywordCell>
): KeywordCell | undefined =>
  values
    .map(({ seriesIdentifier }) => cellsByKeyword.get(seriesIdentifier.key))
    .find((cell) => cell !== undefined);

interface MemoryKeywordTreemapProps {
  /** The memories the keyword graph is built from, already filtered. */
  pages: MemorySummary[];
  /** Canonical keywords the view is filtered by, in click order. */
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  onClearKeywords: () => void;
}

export function MemoryKeywordTreemap({
  pages,
  selectedKeywords,
  onToggleKeyword,
  onClearKeywords,
}: MemoryKeywordTreemapProps) {
  // The ranking is the whole point of the chart and it is a pure function of the
  // loaded rows, so it runs on render rather than in the query. 200 memories ×
  // 25 tags is measured at well under a frame's budget (see the timing test).
  const entries: KeywordEntry[] = useMemo(
    () =>
      pages.map((page) => ({
        tags: page.tags,
        usefulness: page.usefulness,
        confidence: page.confidence,
      })),
    [pages]
  );
  const cells = useMemo(
    () => toKeywordCells(entries, selectedKeywords),
    [entries, selectedKeywords]
  );
  const cellsByKeyword = useMemo(() => new Map(cells.map((cell) => [cell.keyword, cell])), [cells]);
  // The chips label a keyword that the chart has dropped, so the spellings come
  // from every loaded memory rather than from the cells.
  const displayNames = useMemo(() => toKeywordDisplayNames(entries), [entries]);
  // Colour-blind safe, and derived through the hook rather than read once at
  // mount, so a theme change re-derives it instead of freezing light-mode
  // colours into dark mode. Ten colours over forty cells means the palette
  // repeats, which is fine: a cell's identity is its label.
  const palette = useEuiPaletteColorBlindBehindText();
  const chartBaseTheme = useElasticChartsTheme();

  const fillLabel: LayerFillLabel = {
    verticalAlignment: 'middle',
    horizontalAlignment: 'center',
    clipText: cells.length > 1,
    fontWeight: 500,
    minFontSize: 10,
    maxFontSize: 14,
  };

  const onElementClick = useCallback<ElementClickListener>(
    (elements) => {
      const keyword = clickedKeyword(elements);
      if (keyword !== undefined) onToggleKeyword(keyword);
    },
    [onToggleKeyword]
  );

  const renderTooltip = useCallback(
    ({ values }: TooltipInfo) => {
      const cell = tooltipCell(values, cellsByKeyword);
      if (cell === undefined) return null;
      return (
        // A panel of its own: the chart's tooltip surface is transparent over a
        // treemap, so in the dark theme this text would otherwise sit on whatever
        // cell it happened to be drawn over.
        <EuiPanel
          hasBorder
          hasShadow
          paddingSize="s"
          borderRadius="m"
          data-test-subj="nightshiftMemoryTreemapTooltip"
        >
          <EuiText size="s">
            <strong>{cell.display}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.keywordTreemap.scoreValue"
              defaultMessage="Score {score}%"
              values={{ score: asPercent(cell.score) }}
            />
            {' · '}
            <FormattedMessage
              id="xpack.significantEventsApp.memory.keywordTreemap.memoryCount"
              defaultMessage="{count, plural, one {# memory} other {# memories}}"
              values={{ count: cell.memories }}
            />
          </EuiText>
        </EuiPanel>
      );
    },
    [cellsByKeyword]
  );

  // A store with no memories at all has nothing to rank, and an empty chart frame
  // would only take room the memory lists below need.
  if (pages.length === 0 && selectedKeywords.length === 0) return null;

  return (
    <div data-test-subj="nightshiftMemoryTreemap">
      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="xpack.significantEventsApp.memory.keywordTreemap.title"
            defaultMessage="What the store is about"
          />
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.significantEventsApp.memory.keywordTreemap.caption"
            defaultMessage="Cell area is a keyword's share of the store's connections. Select a keyword to filter by it."
          />
        </p>
      </EuiText>

      {selectedKeywords.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <KeywordFilterRow
            selectedKeywords={selectedKeywords}
            displayNames={displayNames}
            onToggleKeyword={onToggleKeyword}
            onClearKeywords={onClearKeywords}
          />
        </>
      )}

      <EuiSpacer size="s" />
      {cells.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="nightshiftMemoryTreemapEmpty">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.keywordTreemap.empty"
            defaultMessage="No keywords to rank in these memories."
          />
        </EuiText>
      ) : (
        <Chart size={{ width: '100%', height: 240 }}>
          <Settings
            baseTheme={chartBaseTheme}
            // The chart's own legend would list forty keywords; the chart and the
            // chip row are the only parts that carry meaning here.
            showLegend={false}
            onElementClick={onElementClick}
          />
          <Partition
            data={cells}
            id="nightshift_memory_keyword_treemap"
            valueAccessor={(cell: KeywordCell) => cell.area}
            valueFormatter={NO_LABEL_VALUE}
            layout={PartitionLayout.treemap}
            layers={[
              {
                // One node per keyword, keyed by its canonical form: the
                // selection stores canonical keys, and the click reports one back.
                groupByRollup: (cell: KeywordCell) => cell.keyword,
                shape: {
                  // `sortIndex` is the cell's place in the value-sorted order the
                  // chart built from these cells, which is the rank order `cells`
                  // already sorted into, so the palette needs no lookup of its own.
                  fillColor: (_key: string, sortIndex: number) =>
                    palette[sortIndex % palette.length],
                },
                // `clipText` keeps a long keyword inside its own cell. The label is
                // asked to sit in the middle of its cell, which the pinned chart
                // ignores for want of the control; the keys light up on their own
                // once Kibana's `@elastic/charts` carries elastic-charts#2912.
                //
                // A one-cell chart cannot ask for it. The chart builds the label's
                // clip out of whatever canvas path its previous draw left behind,
                // and with a single cell that path is the cell itself, so the two
                // wind against each other and the clip comes out empty: the label
                // is laid out and then painted nowhere (elastic-charts 73.2.2).
                // One cell is the whole panel and the chart only places words that
                // fit inside it, so there is nothing to clip against anyway.
                fillLabel,
                nodeLabel: (key) => cellsByKeyword.get(`${key}`)?.display ?? '',
              },
            ]}
          />
          <Tooltip customTooltip={renderTooltip} />
        </Chart>
      )}
    </div>
  );
}

/**
 * What the view is filtered by, as removable chips.
 *
 * Selected keywords are dropped from the treemap rather than restyled, so this
 * row is the only place the filter is visible.
 */
function KeywordFilterRow({
  selectedKeywords,
  displayNames,
  onToggleKeyword,
  onClearKeywords,
}: {
  selectedKeywords: string[];
  displayNames: Map<string, string>;
  onToggleKeyword: (keyword: string) => void;
  onClearKeywords: () => void;
}) {
  return (
    <EuiFlexGroup
      gutterSize="xs"
      responsive={false}
      alignItems="center"
      wrap
      data-test-subj="nightshiftMemoryKeywordFilters"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.keywordTreemap.filteredBy"
            defaultMessage="Filtered by"
          />
        </EuiText>
      </EuiFlexItem>
      {selectedKeywords.map((keyword) => (
        <EuiFlexItem grow={false} key={keyword}>
          <EuiBadge
            color="hollow"
            iconType="cross"
            iconOnClick={() => onToggleKeyword(keyword)}
            onClick={() => onToggleKeyword(keyword)}
            onClickAriaLabel={`${keyword} filter`}
            iconOnClickAriaLabel={`Remove the ${keyword} filter`}
            data-test-subj={`nightshiftMemoryKeywordChip-${keyword}`}
          >
            {/* A selected keyword is no longer in the chart, so its chip carries the
                spelling the chart would have shown. */}
            {displayNames.get(keyword) ?? keyword}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={onClearKeywords}
          data-test-subj="nightshiftMemoryClearKeywords"
        >
          <FormattedMessage
            id="xpack.significantEventsApp.memory.keywordTreemap.clearAll"
            defaultMessage="Clear all"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

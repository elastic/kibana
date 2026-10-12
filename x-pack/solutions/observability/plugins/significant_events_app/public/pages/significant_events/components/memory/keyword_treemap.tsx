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
  useEuiPaletteColorBlindBehindText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import { CrossIcon } from './cross_icon';
import { toKeywordCells, type KeywordCell, type KeywordEntry } from './keyword_page_rank';
import type { MemorySummary } from './types';

/** The chart appends its value as another label row; the percentage lives in the tooltip. */
const NO_LABEL_VALUE = (): string => '';

const asPercent = (value: number): number => Math.round(value * 100);

const isLayerValue = (value: unknown): value is LayerValue =>
  typeof value === 'object' && value !== null && 'groupByRollup' in value;

const clickedKeyword = (elements: Parameters<ElementClickListener>[0]): string | undefined => {
  const [layer] = elements.flat(2).filter(isLayerValue);
  return layer === undefined ? undefined : `${layer.groupByRollup}`;
};

/** From elastic/elastic-charts#2912; inert on the pinned 73.2.2, which drops unknown keys. */
interface FillLabelAlignment {
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  horizontalAlignment?: 'left' | 'center' | 'right';
}

type LayerFillLabel = NonNullable<PartitionLayer['fillLabel']> & FillLabelAlignment;

type ChartsStillLacksFillLabelAlignment = 'verticalAlignment' extends keyof PartitionFillLabel
  ? never
  : true;
const SHIM_NEEDED: ChartsStillLacksFillLabelAlignment = true;
void SHIM_NEEDED;

const tooltipCell = (
  values: TooltipInfo['values'],
  cellsByKeyword: Map<string, KeywordCell>
): KeywordCell | undefined =>
  values
    .map(({ seriesIdentifier }) => cellsByKeyword.get(seriesIdentifier.key))
    .find((cell) => cell !== undefined);

interface MemoryKeywordTreemapProps {
  pages: MemorySummary[];
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
  // Re-derived per theme; ten colours repeat across cells, which is fine.
  const palette = useEuiPaletteColorBlindBehindText();
  const chartBaseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const chartTheme = useMemo(
    () => ({
      partition: {
        sectorLineWidth: 3,
        sectorLineStroke: euiTheme.colors.emptyShade,
      },
    }),
    [euiTheme.colors.emptyShade]
  );

  const fillLabel: LayerFillLabel = {
    verticalAlignment: 'middle',
    horizontalAlignment: 'center',
    clipText: false,
    fontWeight: 400,
    padding: { top: 4, right: 6, bottom: 4, left: 6 },
    maximizeFontSize: true,
    minFontSize: 9,
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
        // Charts' tooltip text colour is unreadable on this panel in either theme.
        <EuiPanel
          hasBorder
          hasShadow
          paddingSize="s"
          borderRadius="m"
          css={{ color: euiTheme.colors.text }}
          data-test-subj="nightshiftMemoryTreemapTooltip"
        >
          <EuiText size="s">
            <strong>{cell.keyword}</strong>
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
    [cellsByKeyword, euiTheme.colors.text]
  );

  if (pages.length === 0 && selectedKeywords.length === 0) return null;

  return (
    <div data-test-subj="nightshiftMemoryTreemap">
      {selectedKeywords.length > 0 && (
        <>
          <KeywordFilterRow
            selectedKeywords={selectedKeywords}
            onToggleKeyword={onToggleKeyword}
            onClearKeywords={onClearKeywords}
          />
          <EuiSpacer size="s" />
        </>
      )}

      {cells.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="nightshiftMemoryTreemapEmpty">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.keywordTreemap.empty"
            defaultMessage="No keywords to rank in these memories."
          />
        </EuiText>
      ) : (
        <div
          className={css`
            border-radius: ${euiTheme.border.radius.medium};
            overflow: hidden;
          `}
        >
          <Chart size={{ width: '100%', height: 220 }}>
            <Settings
              baseTheme={chartBaseTheme}
              theme={chartTheme}
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
                  groupByRollup: (cell: KeywordCell) => cell.keyword,
                  shape: {
                    fillColor: (_key: string, sortIndex: number) =>
                      palette[sortIndex % palette.length],
                  },
                  // Clipping is off: elastic-charts 73.2.2 erases a one-cell chart's label.
                  fillLabel,
                  nodeLabel: (key) => cellsByKeyword.get(`${key}`)?.keyword ?? '',
                },
              ]}
            />
            <Tooltip customTooltip={renderTooltip} />
          </Chart>
        </div>
      )}
    </div>
  );
}

function KeywordFilterRow({
  selectedKeywords,
  onToggleKeyword,
  onClearKeywords,
}: {
  selectedKeywords: string[];
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
            // Passing the component avoids `EuiIcon` fetching a string icon's asset.
            iconType={CrossIcon}
            iconOnClick={() => onToggleKeyword(keyword)}
            onClick={() => onToggleKeyword(keyword)}
            onClickAriaLabel={`${keyword} filter`}
            iconOnClickAriaLabel={`Remove the ${keyword} filter`}
            data-test-subj={`nightshiftMemoryKeywordChip-${keyword}`}
          >
            {keyword}
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

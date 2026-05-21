/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { startCase } from 'lodash';
import { getEmptyTagValue } from '../../../../common/components/empty_value';

/**
 * Normalizes a field value that can arrive from the Entity Store API as a
 * single string, an array of strings, `null`, or `undefined` into a clean
 * `string[]`. Non-string array entries are filtered out.
 *
 * The Zod client type for `entity.source` is `string`, but the underlying ES
 * mapping is a `keyword`, so the API can return an array at runtime.
 */
export const toEntitySourceArray = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') return [value];
  return [];
};

/**
 * Formats a raw `entity.source` token for display. Replaces word separators
 * (underscores, hyphens, camelCase boundaries) with spaces and capitalizes the
 * first letter of each word, e.g. `entityanalytics_okta` -> `Entityanalytics
 * Okta`.
 */
export const formatEntitySource = (value: string): string => startCase(value);

const DEFAULT_OVERFLOW_LABEL = (count: number): string => `+${count}`;

const DEFAULT_OVERFLOW_ARIA_LABEL = (count: number): string =>
  i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.shared.truncatedBadgeList.overflowAria',
    {
      defaultMessage: '{count} more',
      values: { count },
    }
  );

interface TruncatedBadgeListProps {
  /**
   * Raw (already resolved) values to render. Empty arrays render the shared
   * em-dash placeholder so the grid cell never collapses to zero height.
   */
  values: string[];
  /**
   * How many values to render inline as plain text before collapsing the
   * remainder into a single `+N` overflow badge. Defaults to `1`, matching
   * the Entity Analytics flyout's summary grid where only the first value is
   * visible and every extra value is surfaced via the tooltip.
   */
  maxVisible?: number;
  /**
   * Optional pre-render formatter applied to each value. Use this to keep raw
   * tokens (e.g. `entityanalytics_okta`) in the data and only humanize them
   * at render time. The formatted value is also what the overflow tooltip
   * lists.
   */
  formatValue?: (value: string) => string;
  /**
   * Optional title shown above the overflow tooltip content (e.g.
   * `"Additional data sources"`). The content itself is always the
   * comma-joined list of hidden values.
   */
  overflowTooltipTitle?: string;
  /**
   * Optional text size to apply to the value text. Defaults to `xs`.
   */
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

/**
 * Renders a list of string values with the first `maxVisible` shown inline as
 * plain text and any overflow collapsed into a single hollow `+N` badge whose
 * tooltip lists the remaining values. The visible value(s) stay as plain text
 * so the cell reads like a normal field, and the badge signals "there are
 * more values here" without competing for visual weight with the value
 * itself.
 *
 * Used anywhere we show an `entity.source`-style multi-valued field in a
 * compact cell (flyout summary grid, entities data grid, agent builder
 * entity attachment tables) so every surface shares the exact same visual.
 */
export const TruncatedBadgeList = memo(
  ({
    values,
    maxVisible = 1,
    formatValue,
    overflowTooltipTitle,
    textSize = 'xs',
    'data-test-subj': dataTestSubj,
  }: TruncatedBadgeListProps) => {
    const formattedValues = useMemo(
      () => (formatValue ? values.map(formatValue) : values),
      [values, formatValue]
    );

    if (formattedValues.length === 0) {
      return <EuiText size={textSize}>{getEmptyTagValue()}</EuiText>;
    }

    const safeMaxVisible = Math.max(1, maxVisible);
    const visible = formattedValues.slice(0, safeMaxVisible);
    const hidden = formattedValues.slice(safeMaxVisible);

    const overflowTestSubj = dataTestSubj ? `${dataTestSubj}-more` : undefined;

    return (
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        data-test-subj={dataTestSubj}
        css={{ width: '100%' }}
      >
        {visible.map((value) => (
          <EuiFlexItem grow={false} key={value} css={{ minWidth: 0 }}>
            <EuiText size={textSize} className="eui-textTruncate">
              {value}
            </EuiText>
          </EuiFlexItem>
        ))}
        {hidden.length > 0 && (
          <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
            <EuiToolTip position="top" title={overflowTooltipTitle} content={hidden.join(', ')}>
              <EuiBadge
                color="hollow"
                tabIndex={0}
                data-test-subj={overflowTestSubj}
                aria-label={DEFAULT_OVERFLOW_ARIA_LABEL(hidden.length)}
              >
                {DEFAULT_OVERFLOW_LABEL(hidden.length)}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
TruncatedBadgeList.displayName = 'TruncatedBadgeList';

interface EntitySourceValueProps {
  values: TruncatedBadgeListProps['values'];
  textSize?: TruncatedBadgeListProps['textSize'];
  'data-test-subj'?: TruncatedBadgeListProps['data-test-subj'];
}

const DATA_SOURCE_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.grid.dataSourceOverflowTitle',
  { defaultMessage: 'Additional data sources' }
);

/**
 * Renders `entity.source` values using the shared badge list UX. Raw tokens
 * are run through `formatEntitySource` so the inline badge and tooltip list
 * are both human-readable (e.g. `entityanalytics_okta` -> `Entityanalytics
 * Okta`).
 *
 * Accepts a normalized `string[]` (use `toEntitySourceArray` to normalize the
 * raw field value).
 */
export const EntitySourceValue = memo(
  ({
    values,
    'data-test-subj': dataTestSubj = 'entitySourceValue',
    textSize,
  }: EntitySourceValueProps) => (
    <TruncatedBadgeList
      values={values}
      formatValue={formatEntitySource}
      overflowTooltipTitle={DATA_SOURCE_OVERFLOW_TOOLTIP_TITLE}
      data-test-subj={dataTestSubj}
      textSize={textSize}
    />
  )
);
EntitySourceValue.displayName = 'EntitySourceValue';

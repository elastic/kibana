/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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

interface TruncatedListWithTooltipProps {
  values: string[];
  /**
   * i18n id for the "More" label (e.g. `xpack.securitySolution.foo.bar.more`).
   */
  moreLabelId: string;
  /**
   * Default (English) message for the "More" label.
   */
  moreLabelDefaultMessage: string;
  'data-test-subj'?: string;
}

/**
 * Renders the first value inline and, when there is more than one, a
 * `+{N} More` affordance whose tooltip lists the remaining values.
 *
 * Matches the visual used by `Watchlists` in the entity summary grid so that
 * fields that may hold multiple values share the exact same UX.
 */
export const TruncatedListWithTooltip = memo(
  ({
    values,
    moreLabelId,
    moreLabelDefaultMessage,
    'data-test-subj': dataTestSubj,
  }: TruncatedListWithTooltipProps) => {
    if (values.length === 0) {
      return <EuiText size="s">{getEmptyTagValue()}</EuiText>;
    }

    const [first, ...rest] = values;
    const moreCount = rest.length;

    return (
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        wrap
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s">{first}</EuiText>
        </EuiFlexItem>
        {moreCount > 0 && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={rest.join(', ')}>
              <EuiButtonEmpty
                size="xs"
                flush="left"
                data-test-subj={
                  dataTestSubj ? `${dataTestSubj}-more` : 'truncatedListWithTooltip-more'
                }
              >
                {`+${moreCount} `}
                <FormattedMessage id={moreLabelId} defaultMessage={moreLabelDefaultMessage} />
              </EuiButtonEmpty>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
TruncatedListWithTooltip.displayName = 'TruncatedListWithTooltip';

interface EntitySourceValueProps {
  values: string[];
  'data-test-subj'?: string;
}

/**
 * Renders `entity.source` values using the shared truncated-list UX. Raw
 * tokens are run through `formatEntitySource` so both the inline value and the
 * tooltip content are human-readable (e.g. `entityanalytics_okta` ->
 * `Entityanalytics Okta`).
 *
 * Accepts a normalized `string[]` (use `toEntitySourceArray` to normalize the
 * raw field value).
 */
export const EntitySourceValue = memo(
  ({ values, 'data-test-subj': dataTestSubj = 'entitySourceValue' }: EntitySourceValueProps) => {
    const formattedValues = useMemo(() => values.map(formatEntitySource), [values]);

    return (
      <TruncatedListWithTooltip
        values={formattedValues}
        moreLabelId="xpack.securitySolution.flyout.entityDetails.grid.dataSourceMore"
        moreLabelDefaultMessage="More"
        data-test-subj={dataTestSubj}
      />
    );
  }
);
EntitySourceValue.displayName = 'EntitySourceValue';

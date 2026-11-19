/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { FacetBucket } from '../../common/sessions';
import type { Formatters } from '../hooks/use_formatters';
import { SingleSelectFilter } from './single_select_filter';

/** Facet values such as URLs are long, so the button truncates them to leave room for the others. */
const MAX_BUTTON_SIZE = '12em';

/** The "any value" option of a facet, which removes its filter. */
const ANY_VALUE = '';

const ANY_LABEL = i18n.translate('xpack.digitalExperience.facetFilter.anyLabel', {
  defaultMessage: 'Any',
});

/** The facet's values with their counts; a selection outside the top values stays listed. */
export const facetOptions = (
  buckets: FacetBucket[],
  selected: string | undefined,
  { formatNumber }: Pick<Formatters, 'formatNumber'>
) => {
  const options = buckets.map(({ key, count }) => ({
    value: key,
    label: `${key} (${formatNumber(count)})`,
  }));
  const withSelected =
    selected && !buckets.some(({ key }) => key === selected)
      ? [{ value: selected, label: selected }, ...options]
      : options;
  return [{ value: ANY_VALUE, label: ANY_LABEL }, ...withSelected];
};

/**
 * A filter button that lists the values of one facet with their counts, and an "Any" option that
 * removes the filter. Used by the Sessions list and the Overview.
 */
export function FacetFilter({
  label,
  buckets,
  selected,
  onChange,
  formatters,
  isLoading,
  ebtElement,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  buckets: FacetBucket[];
  /** The selected value, `undefined` for any. */
  selected: string | undefined;
  onChange: (value: string | undefined) => void;
  formatters: Pick<Formatters, 'formatNumber'>;
  isLoading: boolean;
  /** Names the filter in click telemetry. */
  ebtElement: string;
  'data-test-subj': string;
}) {
  return (
    <SingleSelectFilter
      data-test-subj={dataTestSubj}
      ebtElement={ebtElement}
      label={label}
      options={facetOptions(buckets, selected, formatters)}
      selected={selected ?? ANY_VALUE}
      isActive={selected !== undefined}
      onChange={(value) => onChange(value || undefined)}
      searchable
      isLoading={isLoading}
      maxButtonInlineSize={MAX_BUTTON_SIZE}
    />
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FILTER_VALUE_CAP, toggleFilterValue } from '../../common/filter_values';
import type { FilterValue } from '../../common/filter_values';
import type { FacetBucket } from '../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../ebt_constants';
import type { Formatters } from '../hooks/use_formatters';
import { FacetOptionRow } from './facet_option_row';
import { FilterLimitNote } from './filter_limit_note';

const listCss = css({ inlineSize: 320 });
const optionsCss = css({ maxBlockSize: 288, overflowY: 'auto' });

export interface FacetRow {
  value: string;
  /** `undefined` for a selected value that the time range has no page loads for. */
  count?: number;
}

/** The facet's values with their counts, and the selected values that are not among them first. */
export const facetRows = (buckets: FacetBucket[], selected: readonly FilterValue[]): FacetRow[] => {
  const listed = new Set(buckets.map(({ key }) => key));
  return [
    ...selected.filter(({ value }) => !listed.has(value)).map(({ value }) => ({ value })),
    ...buckets.map(({ key, count }) => ({ value: key, count })),
  ];
};

/** The text of one selected value, e.g. "Browser: Chrome", or "Browser: not Chrome" when excluded. */
export const filterPillText = (label: string, { value, exclude }: FilterValue): string =>
  exclude
    ? i18n.translate('xpack.digitalExperience.multiFacetFilter.excludedPill', {
        defaultMessage: '{label}: not {value}',
        values: { label, value },
      })
    : i18n.translate('xpack.digitalExperience.multiFacetFilter.includedPill', {
        defaultMessage: '{label}: {value}',
        values: { label, value },
      });

/**
 * A filter button of an `EuiFilterGroup` that lists the values of one facet with their counts, to
 * include or exclude several of them. Each pick applies at once, and the button counts them; the
 * values themselves are shown as pills beside the filters.
 */
export function MultiFacetFilter({
  label,
  buckets,
  values,
  onChange,
  formatters: { formatNumber },
  isLoading,
  ebtElement,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  buckets: FacetBucket[];
  values: FilterValue[];
  onChange: (values: FilterValue[]) => void;
  formatters: Pick<Formatters, 'formatNumber'>;
  isLoading: boolean;
  /** Names the filter in click telemetry. */
  ebtElement: string;
  'data-test-subj': string;
}) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverId = useGeneratedHtmlId({ prefix: dataTestSubj });
  // A value past the cap would be dropped, so the values left cannot be picked.
  const isFull = values.length >= FILTER_VALUE_CAP;

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return facetRows(buckets, values).filter(
      ({ value }) => needle === '' || value.toLowerCase().includes(needle)
    );
  }, [buckets, values, search]);

  return (
    <EuiPopover
      id={popoverId}
      aria-label={label}
      isOpen={isOpen}
      closePopover={() => {
        setIsOpen(false);
        setSearch('');
      }}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          data-test-subj={dataTestSubj}
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_FILTER,
            element: ebtElement,
          })}
          iconType="chevronSingleDown"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={values.length > 0}
          numActiveFilters={values.length > 0 ? values.length : undefined}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <div css={listCss} data-test-subj={`${dataTestSubj}List`}>
        <EuiPopoverTitle paddingSize="s">
          <EuiFieldSearch
            compressed
            fullWidth
            isLoading={isLoading}
            placeholder={i18n.translate('xpack.digitalExperience.multiFacetFilter.search', {
              defaultMessage: 'Filter options',
            })}
            aria-label={label}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-test-subj={`${dataTestSubj}Search`}
          />
        </EuiPopoverTitle>
        <div css={optionsCss}>
          {rows.length === 0 ? (
            <EuiText size="s" color="subdued" css={css({ padding: euiTheme.size.m })}>
              {i18n.translate('xpack.digitalExperience.multiFacetFilter.noValues', {
                defaultMessage: 'No values',
              })}
            </EuiText>
          ) : (
            rows.map(({ value, count }, index) => {
              const selection = values.find((item) => item.value === value);
              return (
                <FacetOptionRow
                  key={value}
                  id={`${popoverId}-${index}`}
                  label={value}
                  count={count === undefined ? undefined : formatNumber(count)}
                  isIncluded={selection !== undefined && !selection.exclude}
                  isExcluded={selection?.exclude === true}
                  isDisabled={isFull && selection === undefined}
                  onInclude={() => onChange(toggleFilterValue(values, value, false))}
                  onExclude={() => onChange(toggleFilterValue(values, value, true))}
                  ebtElement={ebtElement}
                  data-test-subj={`${dataTestSubj}Option-${value}`}
                />
              );
            })
          )}
        </div>
        {values.length > 0 && (
          <EuiPopoverFooter paddingSize="s">
            {isFull && <FilterLimitNote data-test-subj={`${dataTestSubj}LimitNote`} />}
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType="cross"
              onClick={() => onChange([])}
              data-test-subj={`${dataTestSubj}Clear`}
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
                element: ebtElement,
              })}
            >
              {i18n.translate('xpack.digitalExperience.multiFacetFilter.clear', {
                defaultMessage: 'Clear selection',
              })}
            </EuiButtonEmpty>
          </EuiPopoverFooter>
        )}
      </div>
    </EuiPopover>
  );
}

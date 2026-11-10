/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FILTER_VALUE_CAP, toggleFilterValue } from '../../../../../common/filter_values';
import {
  isFreeTextFilter,
  OVERVIEW_FILTER_MAX_LENGTHS,
  OVERVIEW_FILTER_NAMES,
  type OverviewFilterName,
  type OverviewFilterOptions,
  type OverviewFilters,
} from '../../../../../common/overview_filters';
import { encodeOverviewFilters } from '../../../../../common/overview_filters_param';
import { FacetOptionRow } from '../../../../components/facet_option_row';
import { FilterLimitNote } from '../../../../components/filter_limit_note';
import { facetRows } from '../../../../components/multi_facet_filter';
import { TextValueInput } from '../../../../components/text_value_input';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import type { Formatters } from '../../../../hooks/use_formatters';
import { FILTER_EBT_ELEMENTS, FILTER_LABELS } from './overview_filter_labels';

/** Half the window on a narrow screen, never wider than this: the rows are short. */
const FLYOUT_MAX_WIDTH = 640;

const TITLE = i18n.translate('xpack.digitalExperience.overview.filtersFlyout.title', {
  defaultMessage: 'All filters',
});

const TEXT_PLACEHOLDER = i18n.translate(
  'xpack.digitalExperience.overview.filtersFlyout.textPlaceholder',
  { defaultMessage: 'Text in the URL, e.g. /checkout' }
);

const isSameSelection = (a: OverviewFilters, b: OverviewFilters): boolean =>
  encodeOverviewFilters(a) === encodeOverviewFilters(b);

/**
 * Every filter of the Overview with its values, to include or exclude several at once. The picks
 * are a draft until Apply, which sets them all in the URL in one step.
 */
export function AllFiltersFlyout({
  options,
  filters,
  formatters: { formatNumber },
  onApply,
  onClose,
}: {
  options: OverviewFilterOptions | undefined;
  /** The applied filters, which the draft starts from. */
  filters: OverviewFilters;
  formatters: Pick<Formatters, 'formatNumber'>;
  onApply: (filters: OverviewFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<OverviewFilters>(filters);
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'digitalExperienceOverviewFiltersFlyoutTitle',
  });
  const idPrefix = useGeneratedHtmlId({ prefix: 'digitalExperienceOverviewFiltersFlyout' });

  const isDirty = !isSameSelection(draft, filters);
  const hasDraft = OVERVIEW_FILTER_NAMES.some((name) => (draft[name] ?? []).length > 0);

  const toggle = (name: OverviewFilterName, value: string, exclude: boolean) =>
    setDraft((current) => ({
      ...current,
      [name]: toggleFilterValue(current[name] ?? [], value, exclude),
    }));

  // Writing the same text again leaves it as it is, rather than taking it off like a click would.
  const addText = (name: OverviewFilterName, text: string) =>
    setDraft((current) => {
      const values = current[name] ?? [];
      return values.some(({ value }) => value === text)
        ? current
        : { ...current, [name]: toggleFilterValue(values, text, false) };
    });

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      maxWidth={FLYOUT_MAX_WIDTH}
      ownFocus
      aria-labelledby={flyoutTitleId}
      data-test-subj="digitalExperienceOverviewFiltersFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {OVERVIEW_FILTER_NAMES.map((name, filterIndex) => {
          const selected = draft[name] ?? [];
          const rows = facetRows(options?.[name] ?? [], selected);
          const isFull = selected.length >= FILTER_VALUE_CAP;
          return (
            <React.Fragment key={name}>
              {filterIndex > 0 && <EuiSpacer size="m" />}
              <EuiAccordion
                id={`${idPrefix}-${name}`}
                initialIsOpen
                paddingSize="s"
                data-test-subj={`digitalExperienceOverviewFiltersFlyout-${name}`}
                buttonContent={
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h3>{FILTER_LABELS[name]}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    {selected.length > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiNotificationBadge color="subdued">
                          {selected.length}
                        </EuiNotificationBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                }
              >
                {rows.length === 0 && !isFreeTextFilter(name) ? (
                  <EuiText size="s" color="subdued">
                    {i18n.translate('xpack.digitalExperience.overview.filtersFlyout.noValues', {
                      defaultMessage: 'No values in the selected time range',
                    })}
                  </EuiText>
                ) : (
                  rows.map(({ value, count }, index) => {
                    const selection = selected.find((item) => item.value === value);
                    return (
                      <FacetOptionRow
                        key={value}
                        id={`${idPrefix}-${name}-${index}`}
                        label={value}
                        count={count === undefined ? undefined : formatNumber(count)}
                        isIncluded={selection !== undefined && !selection.exclude}
                        isExcluded={selection?.exclude === true}
                        isDisabled={isFull && selection === undefined}
                        onInclude={() => toggle(name, value, false)}
                        onExclude={() => toggle(name, value, true)}
                        ebtElement={FILTER_EBT_ELEMENTS[name]}
                        data-test-subj={`digitalExperienceOverviewFiltersFlyout-${name}Option-${value}`}
                      />
                    );
                  })
                )}
                {isFreeTextFilter(name) && (
                  <>
                    {rows.length > 0 && <EuiSpacer size="xs" />}
                    <TextValueInput
                      onAdd={(text) => addText(name, text)}
                      maxLength={OVERVIEW_FILTER_MAX_LENGTHS[name]}
                      placeholder={TEXT_PLACEHOLDER}
                      isDisabled={isFull}
                      ebtElement={FILTER_EBT_ELEMENTS[name]}
                      data-test-subj={`digitalExperienceOverviewFiltersFlyout-${name}Text`}
                    />
                  </>
                )}
                {isFull && (
                  <>
                    <EuiSpacer size="xs" />
                    <FilterLimitNote
                      data-test-subj={`digitalExperienceOverviewFiltersFlyout-${name}LimitNote`}
                    />
                  </>
                )}
              </EuiAccordion>
            </React.Fragment>
          );
        })}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              iconType="cross"
              isDisabled={!hasDraft}
              onClick={() => setDraft({})}
              data-test-subj="digitalExperienceOverviewFiltersReset"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
                element: APPLICATION_OVERVIEW_EBT_ELEMENTS.ALL_FILTERS_RESET,
              })}
            >
              {i18n.translate('xpack.digitalExperience.overview.filtersFlyout.reset', {
                defaultMessage: 'Clear all',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onClose}
                  data-test-subj="digitalExperienceOverviewFiltersCancel"
                  {...getEbtProps({
                    action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CANCEL_FILTERS,
                    element: APPLICATION_OVERVIEW_EBT_ELEMENTS.ALL_FILTERS_CANCEL,
                  })}
                >
                  {i18n.translate('xpack.digitalExperience.overview.filtersFlyout.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isDisabled={!isDirty}
                  onClick={() => {
                    // A filter without a pick is removed, whether it was cleared or never set.
                    onApply(
                      Object.fromEntries(
                        OVERVIEW_FILTER_NAMES.map((name) => [name, draft[name] ?? []])
                      )
                    );
                    onClose();
                  }}
                  data-test-subj="digitalExperienceOverviewFiltersApply"
                  {...getEbtProps({
                    action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                    element: APPLICATION_OVERVIEW_EBT_ELEMENTS.ALL_FILTERS_APPLY,
                  })}
                >
                  {i18n.translate('xpack.digitalExperience.overview.filtersFlyout.apply', {
                    defaultMessage: 'Apply filters',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

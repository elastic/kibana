/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
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
  useEuiTheme,
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
import { usePersistedChoice } from '../../../../hooks/use_persisted_choice';
import { FILTER_EBT_ELEMENTS, FILTER_LABELS, FILTER_NOTES } from './overview_filter_labels';

/** The width of the flyout, in pixels, by mode: pushed, it takes less of the page beside it. */
const DEFAULT_FLYOUT_WIDTHS = { overlay: 560, push: 320 } as const;
const MIN_FLYOUT_WIDTH = 280;
const MAX_FLYOUT_WIDTH = 900;
/** The widths the user dragged the flyout to, by mode, kept across visits. */
const FLYOUT_WIDTH_STORAGE_KEY = 'xpack.digitalExperience.overview.filtersFlyoutWidth';
/** How long after the user stops dragging the width is stored. */
const WIDTH_SAVE_DEBOUNCE_MS = 300;

/**
 * The heights of the app header above the page: its title row, and the whole header with the tabs.
 * The header of the flyout beside the page has them, so the two titles and rules line up.
 */
const PAGE_HEADER_TITLE_ROW_HEIGHT = 52;
const PAGE_HEADER_HEIGHT = 93;

const clampWidth = (width: unknown, fallback: number): number =>
  typeof width === 'number' && Number.isFinite(width)
    ? Math.min(MAX_FLYOUT_WIDTH, Math.max(MIN_FLYOUT_WIDTH, width))
    : fallback;

/** Whether the flyout covers the page or pushes it aside, kept across visits; covers by default. */
const FLYOUT_TYPE_STORAGE_KEY = 'xpack.digitalExperience.overview.filtersFlyoutType';
const FLYOUT_TYPES = ['overlay', 'push'] as const;
type FlyoutType = (typeof FLYOUT_TYPES)[number];

/** The width of the flyout in `type` mode, and how to change it as the user drags the edge. */
const useFlyoutWidth = (type: FlyoutType): [number, (width: number) => void] => {
  const [saved, setSaved] = useLocalStorage<Partial<Record<FlyoutType, number>>>(
    FLYOUT_WIDTH_STORAGE_KEY,
    {}
  );
  const savedWidth = clampWidth(saved?.[type], DEFAULT_FLYOUT_WIDTHS[type]);
  const [drag, setDrag] = useState<{ type: FlyoutType; width: number }>();
  // A drag reports a width on every mouse move; what the user settled on is stored once, after.
  useDebounce(
    () => {
      if (drag && drag.width !== clampWidth(saved?.[drag.type], -1)) {
        setSaved({ ...saved, [drag.type]: drag.width });
      }
    },
    WIDTH_SAVE_DEBOUNCE_MS,
    [drag]
  );
  return [drag?.type === type ? drag.width : savedWidth, (width) => setDrag({ type, width })];
};

const FLYOUT_TYPE_LEGEND = i18n.translate(
  'xpack.digitalExperience.overview.filtersFlyout.typeLegend',
  { defaultMessage: 'Flyout mode' }
);

const FLYOUT_TYPE_OPTIONS = [
  {
    id: 'overlay',
    label: i18n.translate('xpack.digitalExperience.overview.filtersFlyout.overlayLabel', {
      defaultMessage: 'Overlay',
    }),
    iconType: 'layers',
    'data-test-subj': 'digitalExperienceOverviewFiltersFlyoutOverlay',
  },
  {
    id: 'push',
    label: i18n.translate('xpack.digitalExperience.overview.filtersFlyout.pushLabel', {
      defaultMessage: 'Push',
    }),
    iconType: 'menuRight',
    'data-test-subj': 'digitalExperienceOverviewFiltersFlyoutPush',
  },
];

const CLOSE_LABEL = i18n.translate('xpack.digitalExperience.overview.filtersFlyout.close', {
  defaultMessage: 'Close',
});

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
  const { euiTheme } = useEuiTheme();
  const [flyoutType, setFlyoutType] = usePersistedChoice(
    FLYOUT_TYPE_STORAGE_KEY,
    FLYOUT_TYPES,
    'overlay'
  );
  const [width, setWidth] = useFlyoutWidth(flyoutType);

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
      paddingSize="l"
      resizable
      // The close button is in the header, in the row of the mode toggle, rather than apart from it.
      hideCloseButton
      size={width}
      minWidth={MIN_FLYOUT_WIDTH}
      maxWidth={MAX_FLYOUT_WIDTH}
      onResize={setWidth}
      type={flyoutType}
      // Pushed, the page beside it stays in use, so the focus is not held in the flyout.
      ownFocus={flyoutType === 'overlay'}
      // Pushed from a tablet up, so a window as narrow as a laptop split in two still gets it.
      pushMinBreakpoint="m"
      aria-labelledby={flyoutTitleId}
      data-test-subj="digitalExperienceOverviewFiltersFlyout"
    >
      <EuiFlyoutHeader hasBorder css={{ blockSize: PAGE_HEADER_HEIGHT }}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
          // Up to the top edge of the flyout, over its padding, as the title row of the page is.
          css={{
            blockSize: PAGE_HEADER_TITLE_ROW_HEIGHT,
            marginBlockStart: `calc(${euiTheme.size.l} * -1)`,
          }}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 id={flyoutTitleId}>{TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  isIconOnly
                  buttonSize="compressed"
                  legend={FLYOUT_TYPE_LEGEND}
                  options={FLYOUT_TYPE_OPTIONS}
                  idSelected={flyoutType}
                  onChange={setFlyoutType}
                  data-test-subj="digitalExperienceOverviewFiltersFlyoutType"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="cross"
                  color="text"
                  aria-label={CLOSE_LABEL}
                  onClick={onClose}
                  data-test-subj="digitalExperienceOverviewFiltersFlyoutClose"
                  {...getEbtProps({
                    action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CANCEL_FILTERS,
                    element: APPLICATION_OVERVIEW_EBT_ELEMENTS.ALL_FILTERS_CANCEL,
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
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
                {FILTER_NOTES[name] !== undefined && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText
                      size="xs"
                      color="subdued"
                      data-test-subj={`digitalExperienceOverviewFiltersFlyout-${name}Note`}
                    >
                      {FILTER_NOTES[name]}
                    </EuiText>
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
              size="s"
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
                  size="s"
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
                  size="s"
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

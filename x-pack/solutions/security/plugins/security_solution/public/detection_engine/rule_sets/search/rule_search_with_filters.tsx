/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexItem,
  EuiIcon,
  EuiInputPopover,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import type { EuiFieldSearchProps, EuiIconProps, EuiSelectableOption } from '@elastic/eui';
import { SEARCH_PLACEHOLDER, SEARCH_RULES } from '../../common/translations';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRuleSetsQuery } from '../api';
import { TAGS } from '../facets/translations';
import { facetFilterState } from '../table_query';
import {
  fieldHasInlineValues,
  SEARCH_FIELDS,
  TAGS_FIELD_ID,
  useFilterSearchOptions,
} from './rule_filter_search_options';
import type { SearchFacetValue } from './rule_filter_search_options';
import * as i18n from './translations';

const MAX_SUGGESTIONS = 5;
const MAX_VALUE_ROWS = 8;
const EMPTY_VALUES: SearchFacetValue[] = [];

interface Picker {
  searchText: string;
  fieldId: string;
  fieldQuery: string;
}

const FACET_ICONS: Partial<Record<string, EuiIconProps['type']>> = {
  enabled: 'checkCircle',
  integration: 'package',
  lastResponse: 'clock',
  severity: 'shield',
  source: 'layers',
  [TAGS_FIELD_ID]: 'tag',
  tactic: 'flag',
  technique: 'crosshair',
  type: 'listBullet',
};

const facetIcon = (fieldId: string) => FACET_ICONS[fieldId] ?? 'filter';

type OptionAction =
  | { kind: 'search' }
  | { kind: 'field'; fieldId: string }
  | { kind: 'value'; value: SearchFacetValue };
type SearchOption = EuiSelectableOption<{ data?: OptionAction }>;

interface RuleSearchWithFiltersProps {
  onSearch: (value: string) => void;
  onApplyFilter: () => void;
  placeholder?: string;
  recentSearches?: ReactNode;
  prepend?: EuiFieldSearchProps['prepend'];
}

const lowerCase = (value: string) => value.trim().toLocaleLowerCase();

const valuePlaceholder = (fieldId: string) => {
  switch (fieldId) {
    case TAGS_FIELD_ID:
      return i18n.FIND_TAGS;
    case 'tactic':
      return i18n.FIND_TACTICS;
    case 'technique':
      return i18n.FIND_TECHNIQUES;
    default:
      return i18n.FIND_FILTER_VALUES;
  }
};

const searchFieldOptions = (fields: typeof SEARCH_FIELDS): SearchOption[] =>
  fields.map(({ id, label }) => ({
    key: `field/${id}`,
    label,
    prepend: <EuiIcon type={facetIcon(id)} aria-hidden />,
    append: <EuiIcon type="chevronSingleRight" aria-hidden />,
    data: { kind: 'field', fieldId: id },
  }));

const searchValueOptions = (values: SearchFacetValue[]): SearchOption[] =>
  values.map((value) => ({
    key: `value/${value.field.id}/${value.value}`,
    label: value.label,
    prepend: (
      <EuiIcon
        type={facetIcon(value.field.section === 'tags' ? TAGS_FIELD_ID : value.field.id)}
        color={value.field.dotColor?.(value.value)}
        aria-hidden
      />
    ),
    append: (
      <EuiText color="subdued" size="xs">
        {value.field.section === 'tags' ? TAGS : value.field.label}
      </EuiText>
    ),
    data: { kind: 'value', value },
  }));

const findFields = (term: string) =>
  term.length >= 2 ? SEARCH_FIELDS.filter(({ label }) => lowerCase(label).includes(term)) : [];

const findValues = (term: string, values: Map<string, SearchFacetValue[]>) => {
  if (term.length < 2) return EMPTY_VALUES;
  return [...values.values()]
    .flatMap((fieldValues) =>
      fieldValues.filter(
        ({ label, field }) =>
          lowerCase(label).includes(term) || lowerCase(`${label} ${field.label}`).includes(term)
      )
    )
    .sort((a, b) => Number(lowerCase(b.value) === term) - Number(lowerCase(a.value) === term))
    .slice(0, MAX_SUGGESTIONS);
};

const getPickerOptions = (
  text: string,
  picker: Picker | undefined,
  values: Map<string, SearchFacetValue[]>
): { options: SearchOption[]; remainingText?: string } => {
  const term = lowerCase(text);
  const fields = findFields(term);
  if (picker) {
    const matches = (values.get(picker.fieldId) ?? EMPTY_VALUES).filter(({ label }) =>
      lowerCase(label).includes(term)
    );
    return {
      options: [
        ...searchValueOptions(matches),
        ...searchFieldOptions(fields.filter(({ id }) => id !== picker.fieldId)),
      ],
    };
  }

  const inline = fields.find(
    ({ id, label }) => fieldHasInlineValues(id) && lowerCase(label) === term
  );
  const matches = inline
    ? values.get(inline.id) ?? EMPTY_VALUES
    : fields.length
    ? EMPTY_VALUES
    : findValues(term, values);
  const trailingWord = text.trim().match(/\s+(\S{3,})$/);
  const trailingFields =
    fields.length === 0 && matches.length === 0 && trailingWord
      ? findFields(lowerCase(trailingWord[1]))
      : [];
  const filterOptions = [
    ...searchFieldOptions(inline ? [] : [...fields, ...trailingFields]),
    ...searchValueOptions(matches),
  ];
  if (filterOptions.length === 0) return { options: [] };
  return {
    options: [
      {
        key: 'search',
        label: i18n.RUN_TEXT_SEARCH(text.trim()),
        prepend: <EuiIcon type="magnify" aria-hidden />,
        data: { kind: 'search' },
      },
      { label: i18n.FILTER_SUGGESTIONS, isGroupLabel: true },
      ...filterOptions,
    ],
    remainingText: trailingFields.length ? text.trim().slice(0, trailingWord?.index) : undefined,
  };
};

/** The rules search and the filter picker share an input, while exact filters use the sidebar state. */
export const RuleSearchWithFilters = ({
  onSearch,
  onApplyFilter,
  placeholder,
  recentSearches,
  prepend,
}: RuleSearchWithFiltersProps) => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { data: ruleSets } = useRuleSetsQuery();
  const selectedSet = ruleSets?.find((set) => set.id === filterOptions.ruleSetId);
  const [text, setText] = useState(filterOptions.filter);
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState<Picker>();
  const pickerPanel = useRef<HTMLElement | null>(null);
  const searchWidth = useRef(0);
  const refocus = useRef(false);
  const navigatedOptions = useRef(false);
  const fieldId = picker?.fieldId;
  const { values, isLoading } = useFilterSearchOptions(filterOptions, fieldId);

  useEffect(() => {
    setText(filterOptions.filter);
    setPicker(undefined);
    setOpen(false);
    navigatedOptions.current = false;
  }, [filterOptions.filter, filterOptions.ruleSetId]);

  const { options, remainingText } = getPickerOptions(text, picker, values);
  const scrollable = options.length > MAX_VALUE_ROWS;
  const showRecent = !picker && !text.trim() && recentSearches != null;
  const isOpen = open && (picker != null || options.length > 0 || showRecent);
  const resizePicker = useCallback((width: number) => {
    searchWidth.current = width;
    if (pickerPanel.current) {
      // Set this before EUI positions the panel, which has to reach the center of its anchor.
      const maxWidth = Math.max(480, Math.ceil(width / 2));
      pickerPanel.current.style.maxInlineSize = `${maxWidth}px`;
    }
  }, []);
  const setPickerPanel = useCallback(
    (element: HTMLElement | null) => {
      pickerPanel.current = element;
      resizePicker(searchWidth.current);
    },
    [resizePicker]
  );

  const submitText = () => {
    navigatedOptions.current = false;
    setOpen(false);
    onSearch(text.trim());
  };
  const close = () => {
    navigatedOptions.current = false;
    if (picker) {
      setText(picker.fieldQuery);
      setPicker(undefined);
    }
    setOpen(false);
  };
  const chooseField = (nextFieldId: string) => {
    refocus.current = true;
    navigatedOptions.current = false;
    setPicker({
      fieldId: nextFieldId,
      fieldQuery: picker?.fieldQuery ?? text,
      searchText: picker?.searchText ?? remainingText ?? filterOptions.filter,
    });
    setText('');
  };
  const apply = ({ field, value }: SearchFacetValue) => {
    const conditions = filterOptions.conditions ?? {};
    const selection = field.get(conditions);
    if (!selection.include.includes(value)) {
      const next = field.set(conditions, {
        include: field.single ? [value] : [...selection.include, value],
        exclude: selection.exclude.filter((excluded) => excluded !== value),
      });
      onApplyFilter();
      setFilterOptions(facetFilterState(filterOptions, next, selectedSet));
    }
    refocus.current = Boolean(picker);
    navigatedOptions.current = false;
    setText(picker?.searchText ?? filterOptions.filter);
    setPicker(undefined);
    setOpen(false);
  };

  return (
    <EuiFlexItem css={{ minWidth: 200 }}>
      <EuiSelectable
        key={fieldId ?? 'search'}
        aria-label={i18n.FILTER_SUGGESTIONS}
        searchable
        isPreFiltered
        isLoading={isLoading}
        emptyMessage={i18n.NO_FILTER_MATCHES}
        noMatchesMessage={i18n.NO_FILTER_MATCHES}
        options={showRecent ? [] : options}
        height={scrollable ? MAX_VALUE_ROWS * 32 : undefined}
        listProps={
          scrollable
            ? { showIcons: false, rowHeight: 32 }
            : { showIcons: false, isVirtualized: false }
        }
        searchProps={{
          'aria-label': SEARCH_RULES,
          'data-test-subj': 'ruleSearchField',
          autoFocus: refocus.current,
          placeholder: fieldId ? valuePlaceholder(fieldId) : placeholder ?? SEARCH_PLACEHOLDER,
          prepend,
          value: text,
          onFocus: () => {
            if (!refocus.current) setOpen(true);
            refocus.current = false;
          },
          onClick: () => setOpen(true),
          onChange: (query) => {
            if (query === text) return;
            navigatedOptions.current = false;
            setText(query);
            setOpen(true);
            if (!query && !picker) onSearch('');
          },
          onKeyDown: (event) => {
            if (event.nativeEvent.isComposing) {
              event.stopPropagation();
              return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              navigatedOptions.current = true;
              setOpen(true);
              return;
            }
            if (event.key !== 'Enter' || picker) return;

            // EUI can keep an active descendant when the set of suggestions changes.
            // Enter submits the text unless the user navigated to an available suggestion.
            const { currentTarget } = event;
            const active = currentTarget.getAttribute('aria-activedescendant');
            if (
              isOpen &&
              navigatedOptions.current &&
              active &&
              currentTarget.ownerDocument.getElementById(active)
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            submitText();
          },
        }}
        onChange={(_, __, option) => {
          const action = option.data;
          if (action?.kind === 'search') submitText();
          if (action?.kind === 'field') chooseField(action.fieldId);
          if (action?.kind === 'value') apply(action.value);
        }}
      >
        {(list, search) =>
          search && (
            <EuiInputPopover
              fullWidth
              disableFocusTrap
              input={search}
              isOpen={isOpen}
              closePopover={close}
              panelPaddingSize="s"
              panelRef={setPickerPanel}
              onPanelResize={resizePicker}
              panelProps={{ 'data-test-subj': 'ruleSearchFilterPicker' }}
              css={{ display: 'block' }}
            >
              {showRecent ? recentSearches : list}
              {picker && (
                <EuiButtonEmpty
                  iconType="chevronSingleLeft"
                  size="xs"
                  onClick={() => {
                    refocus.current = true;
                    setText(picker.fieldQuery);
                    setPicker(undefined);
                    navigatedOptions.current = false;
                  }}
                >
                  {i18n.BACK_TO_FILTER_FIELDS}
                </EuiButtonEmpty>
              )}
            </EuiInputPopover>
          )
        }
      </EuiSelectable>
    </EuiFlexItem>
  );
};

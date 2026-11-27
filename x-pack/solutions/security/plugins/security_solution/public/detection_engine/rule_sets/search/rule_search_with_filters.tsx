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
import type { FilterOptions } from '../../rule_management/logic/types';
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

const MAX_SUGGESTIONS = 7;
const MAX_FIELD_VALUE_ROWS = 8;
const OPTION_ROW_HEIGHT = 32;
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
  onApplyFilter: (options: Partial<FilterOptions>) => void;
  placeholder?: string;
  recentSearches?: ReactNode;
  prepend?: EuiFieldSearchProps['prepend'];
}

const lowerCase = (value: string) => value.trim().toLocaleLowerCase();
const normalizeValueText = (value: string) => lowerCase(value).replace(/\s*:\s*/g, ':');

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

const getActiveTerm = (text: string, caret: number) => {
  // A category and its value can be typed with or without spaces around the colon.
  for (const match of text.matchAll(/[^\s:]+(?:\s*:\s*[^\s:]*)?/g)) {
    const start = match.index!;
    const end = start + match[0].length;
    if (start > caret) return;
    if (caret <= end) {
      return {
        term: match[0],
        remainingText: [text.slice(0, start).trimEnd(), text.slice(end).trimStart()]
          .filter(Boolean)
          .join(' ')
          .trim(),
      };
    }
  }
};

enum MatchQuality {
  Exact,
  TagPart,
  Prefix,
  Word,
  Partial,
}

const matchQuality = ({ label, value, field }: SearchFacetValue, term: string) => {
  const normalizedLabel = normalizeValueText(label);
  const normalizedValue = normalizeValueText(value);
  if (normalizedLabel === term || normalizedValue === term) return MatchQuality.Exact;
  if (!normalizedLabel.includes(term) && !normalizedValue.includes(term)) return;

  const tagValue =
    field.section === 'tags' ? normalizedLabel.slice(normalizedLabel.indexOf(':') + 1) : '';
  if (tagValue && (tagValue === term || normalizedLabel.startsWith(`${term}:`))) {
    return MatchQuality.TagPart;
  }

  // Technique labels display the ID before the name, so either can match from the start.
  const name = normalizedLabel.replace(`${normalizedValue} · `, '');
  if (name === term) return MatchQuality.Exact;
  if (name.startsWith(term) || tagValue.startsWith(term) || normalizedValue.startsWith(term)) {
    return MatchQuality.Prefix;
  }
  if (name.split(/[^\p{L}\p{N}]+/u).includes(term)) return MatchQuality.Word;
  return MatchQuality.Partial;
};

const findValues = (text: string, values: Map<string, SearchFacetValue[]>) => {
  const term = normalizeValueText(text);
  if (term.length < 2) return EMPTY_VALUES;

  const matches = [];
  for (const fieldValues of values.values()) {
    for (const suggestion of fieldValues) {
      const quality = matchQuality(suggestion, term);
      if (quality !== undefined) matches.push({ suggestion, quality });
    }
  }
  matches.sort(
    (a, b) =>
      a.quality - b.quality ||
      a.suggestion.label.length - b.suggestion.label.length ||
      a.suggestion.label.localeCompare(b.suggestion.label)
  );

  const types = new Set<string>();
  const firstByType: SearchFacetValue[] = [];
  const remaining: SearchFacetValue[] = [];
  for (const { suggestion, quality } of matches) {
    const type = suggestion.field.section === 'tags' ? TAGS_FIELD_ID : suggestion.field.id;
    if (quality <= MatchQuality.Word && !types.has(type)) {
      types.add(type);
      firstByType.push(suggestion);
    } else {
      remaining.push(suggestion);
    }
  }
  return [...firstByType, ...remaining].slice(0, MAX_SUGGESTIONS);
};

const getPickerOptions = (
  text: string,
  caret: number,
  picker: Picker | undefined,
  values: Map<string, SearchFacetValue[]>
): { options: SearchOption[]; remainingText?: string } => {
  if (picker) {
    const fields = findFields(lowerCase(text));
    const valueTerm = normalizeValueText(text);
    const matches = (values.get(picker.fieldId) ?? EMPTY_VALUES).filter(({ label }) =>
      normalizeValueText(label).includes(valueTerm)
    );
    return {
      options: [
        ...searchValueOptions(matches),
        ...searchFieldOptions(fields.filter(({ id }) => id !== picker.fieldId)),
      ],
    };
  }

  const activeTerm = getActiveTerm(text, caret);
  if (!activeTerm) return { options: [] };

  const term = lowerCase(activeTerm.term);
  const fields = findFields(term);
  const inline = fields.find(
    ({ id, label }) => fieldHasInlineValues(id) && lowerCase(label) === term
  );
  const matches = inline
    ? values.get(inline.id) ?? EMPTY_VALUES
    : fields.length
    ? EMPTY_VALUES
    : findValues(term, values);
  const filterOptions = [
    ...searchFieldOptions(inline ? [] : fields),
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
    remainingText: activeTerm.remainingText,
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
  } = useRulesTableContext();
  const { data: ruleSets } = useRuleSetsQuery();
  const selectedSet = ruleSets?.find((set) => set.id === filterOptions.ruleSetId);
  const [text, setText] = useState(filterOptions.filter);
  const [caret, setCaret] = useState<number | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
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
    setCaret(null);
    setPicker(undefined);
    setOpen(false);
    navigatedOptions.current = false;
  }, [filterOptions.filter, filterOptions.ruleSetId]);

  const { options, remainingText } = getPickerOptions(text, caret ?? text.length, picker, values);
  const syncCaret = (input: HTMLInputElement) => {
    if (!picker && input.selectionEnd !== caret) {
      setCaret(input.selectionEnd);
      navigatedOptions.current = false;
    }
  };
  const scrollable = Boolean(picker) && options.length > MAX_FIELD_VALUE_ROWS;
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
    const searchText = picker?.searchText ?? remainingText ?? filterOptions.filter;
    const searchChanged = searchText !== filterOptions.filter;
    const alreadySelected = selection.include.includes(value);
    if (!alreadySelected || searchChanged) {
      const next = alreadySelected
        ? conditions
        : field.set(conditions, {
            include: field.single ? [value] : [...selection.include, value],
            exclude: selection.exclude.filter((excluded) => excluded !== value),
          });
      onApplyFilter({
        ...facetFilterState(filterOptions, next, selectedSet),
        ...(searchChanged ? { filter: searchText } : {}),
      });
    }
    refocus.current = Boolean(picker);
    navigatedOptions.current = false;
    setText(searchText);
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
        height={scrollable ? MAX_FIELD_VALUE_ROWS * OPTION_ROW_HEIGHT : undefined}
        listProps={
          scrollable
            ? { showIcons: false, rowHeight: OPTION_ROW_HEIGHT }
            : { showIcons: false, isVirtualized: false }
        }
        searchProps={{
          'aria-label': SEARCH_RULES,
          'data-test-subj': 'ruleSearchField',
          autoFocus: refocus.current,
          placeholder: fieldId ? valuePlaceholder(fieldId) : placeholder ?? SEARCH_PLACEHOLDER,
          prepend,
          value: text,
          inputRef: (input) => {
            searchInput.current = input;
          },
          onFocus: (event) => {
            if (!refocus.current) setOpen(true);
            syncCaret(event.currentTarget);
            refocus.current = false;
          },
          onClick: (event) => {
            syncCaret(event.currentTarget);
            setOpen(true);
          },
          onSelect: (event) => syncCaret(event.currentTarget),
          onChange: (query) => {
            if (query === text) return;
            if (searchInput.current) syncCaret(searchInput.current);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIconTip,
  EuiNotificationBadge,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import type {
  FacetCountsResult,
  FacetField,
  FacetLabels,
  FacetSection,
  FacetSelection,
  FacetValue,
} from './facet_fields';
import { allFacetFields, hasSelection } from './facet_fields';
import { useMitreConfiguration } from '../../../common/hooks/mitre/use_mitre_configuration';
import { useIntegrationTitles } from '../components/group_by_fields';
import * as i18n from './translations';

const VISIBLE_VALUES = 5;
const SEARCH_FROM = 10;
const VISIBLE_TAG_GROUPS = 6;
const NO_VALUES: FacetValue[] = [];
const MAX_FILTER_MATCHES = 50;

const findFilterMatches = (
  query: string,
  fields: FacetField[],
  valuesById: Map<string, FacetValue[]>,
  conditions: RuleSetConditions,
  labels: FacetLabels,
  includeFieldLabels = true
) => {
  const normalize = (text: string) =>
    text
      .trim()
      .toLocaleLowerCase()
      .replace(/\s*:\s*/g, ':');
  const terms = normalize(query).split(/\s+/);
  if (!terms[0]) return;

  const groups = [];
  let total = 0;
  for (const field of fields) {
    const selection = field.get(conditions);
    const byValue = new Map(valuesById.get(field.id)?.map((value) => [value.value, value]));
    for (const value of [...selection.include, ...selection.exclude]) {
      if (!byValue.has(value)) {
        byValue.set(value, { value, label: field.valueLabel(value, labels), count: 0 });
      }
    }
    const fieldLabel = field.section === 'tags' ? `${i18n.TAGS} ${field.label}` : field.label;
    const matches = [...byValue.values()].filter(({ label, value }) => {
      const searchable = normalize(`${includeFieldLabels ? fieldLabel : ''} ${label} ${value}`);
      return terms.every((term) => searchable.includes(term));
    });
    const visible = matches.slice(0, Math.max(0, MAX_FILTER_MATCHES - total));
    total += matches.length;
    if (visible.length) groups.push({ field, selection, values: visible });
  }
  return { groups, total };
};

const usePanelStyles = () => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => ({
      row: css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        min-height: 26px;
        padding: 0 ${euiTheme.size.xs};
        border-radius: ${euiTheme.border.radius.small};
        &:hover {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
        .ruleFacetExclude {
          opacity: 0;
        }
        &:hover .ruleFacetExclude,
        &:focus-within .ruleFacetExclude {
          opacity: 1;
        }
      `,
      checkbox: css`
        flex: 1;
        min-width: 0;
        .euiCheckbox__label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
      excludedLabel: css`
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-decoration: line-through;
        color: ${euiTheme.colors.textDanger};
      `,
      wrapLabel: css`
        display: block;
        white-space: normal;
        overflow-wrap: anywhere;
      `,
      empty: css`
        color: ${euiTheme.colors.textDisabled};
      `,
      count: css`
        flex-shrink: 0;
        min-width: 28px;
        padding: 0 6px;
        border-radius: 10px;
        text-align: right;
        font-size: ${euiTheme.size.m};
        line-height: 18px;
        font-variant-numeric: tabular-nums;
        color: ${euiTheme.colors.textSubdued};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        transition: opacity ${euiTheme.animation.normal};
      `,
      countSelected: css`
        color: ${euiTheme.colors.textPrimary};
        background: ${euiTheme.colors.backgroundLightPrimary};
      `,
      countExcluded: css`
        color: ${euiTheme.colors.textDanger};
        background: ${euiTheme.colors.backgroundLightDanger};
      `,
      updating: css`
        .ruleFacetCount {
          opacity: 0.45;
        }
      `,
      section: css`
        margin: ${euiTheme.size.m} 0 ${euiTheme.size.xs};
        padding-top: ${euiTheme.size.s};
        border-top: ${euiTheme.border.thin};
        font-size: ${euiTheme.size.m};
        font-weight: ${euiTheme.font.weight.semiBold};
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: ${euiTheme.colors.textSubdued};
      `,
      group: css`
        & + & {
          margin-top: 2px;
        }
      `,
    }),
    [euiTheme]
  );
};

type PanelStyles = ReturnType<typeof usePanelStyles>;

const FacetValueRow = ({
  field,
  value,
  selection,
  onChange,
  styles,
  countsByMeaning = false,
}: {
  field: FacetField;
  value: FacetValue;
  selection: FacetSelection;
  onChange: (next: FacetSelection) => void;
  styles: PanelStyles;
  countsByMeaning?: boolean;
}) => {
  const id = useGeneratedHtmlId({ prefix: `ruleFacet-${field.id}` });
  const isIncluded = selection.include.includes(value.value);
  const isExcluded = selection.exclude.includes(value.value);
  const noCount =
    countsByMeaning && !isIncluded && selection.include.length + selection.exclude.length > 0;
  const without = (values: string[]) => values.filter((v) => v !== value.value);

  const toggleInclude = () =>
    onChange({
      include: isIncluded
        ? without(selection.include)
        : field.single
        ? [value.value]
        : [...selection.include, value.value],
      exclude: without(selection.exclude),
    });
  const toggleExclude = () =>
    onChange({
      include: without(selection.include),
      exclude: isExcluded ? without(selection.exclude) : [...selection.exclude, value.value],
    });

  const dot = field.dotColor?.(value.value);
  const text = dot ? (
    <EuiHealth color={dot} textSize="inherit">
      {value.label}
    </EuiHealth>
  ) : (
    value.label
  );

  return (
    <div css={styles.row} data-test-subj={`ruleFacetValue-${field.id}-${value.value}`}>
      {isExcluded ? (
        <>
          <EuiToolTip content={i18n.UNDO_EXCLUDE(value.label)} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="minusCircle"
              color="danger"
              size="xs"
              aria-label={i18n.UNDO_EXCLUDE(value.label)}
              onClick={toggleExclude}
              data-test-subj={`ruleFacetExcluded-${field.id}-${value.value}`}
            />
          </EuiToolTip>
          <span
            css={[styles.excludedLabel, field.searchable && styles.wrapLabel]}
            title={value.label}
          >
            {text}
          </span>
        </>
      ) : (
        <EuiCheckbox
          id={id}
          css={styles.checkbox}
          checked={isIncluded}
          onChange={toggleInclude}
          title={value.label}
          label={
            <span
              css={[
                field.searchable && styles.wrapLabel,
                value.count === 0 && !isIncluded && !noCount && styles.empty,
              ]}
            >
              {text}
            </span>
          }
        />
      )}
      {field.canExclude && !isExcluded && (
        <EuiToolTip content={i18n.EXCLUDE(value.label)} disableScreenReaderOutput>
          <EuiButtonIcon
            className="ruleFacetExclude"
            iconType="minusCircle"
            size="xs"
            color="text"
            aria-label={i18n.EXCLUDE(value.label)}
            onClick={toggleExclude}
            data-test-subj={`ruleFacetExclude-${field.id}-${value.value}`}
          />
        </EuiToolTip>
      )}
      <span
        className="ruleFacetCount"
        css={[styles.count, isIncluded && styles.countSelected, isExcluded && styles.countExcluded]}
      >
        {noCount ? (
          <EuiToolTip content={i18n.NO_COUNT_BY_MEANING} disableScreenReaderOutput>
            <span tabIndex={0} aria-label={i18n.NO_COUNT_BY_MEANING}>
              —
            </span>
          </EuiToolTip>
        ) : (
          value.count
        )}
      </span>
    </div>
  );
};

/**
 * The order of the values stays as it was first seen, so values do not jump under the cursor when
 * counts change after a click. A value seen once stays (with 0) until `resetKey` changes.
 */
const useStableValues = (
  values: FacetValue[],
  selection: FacetSelection,
  ordered: boolean | undefined,
  resetKey: string
): FacetValue[] => {
  const seen = useRef<{ key: string; order: string[]; labels: Map<string, string> }>({
    key: resetKey,
    order: [],
    labels: new Map(),
  });
  return useMemo(() => {
    if (seen.current.key !== resetKey) {
      seen.current = { key: resetKey, order: [], labels: new Map() };
    }
    const memory = seen.current;
    const byValue = new Map(values.map((value) => [value.value, value]));
    values.forEach(({ value, label }) => memory.labels.set(value, label));
    const known = new Set(memory.order);
    const fresh = values
      .filter(({ value }) => !known.has(value))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map(({ value }) => value);
    const missingSelected = [...selection.include, ...selection.exclude].filter(
      (value) => !known.has(value) && !byValue.has(value)
    );
    memory.order = [...memory.order, ...fresh, ...missingSelected];
    const stable = memory.order.map(
      (value) => byValue.get(value) ?? { value, label: memory.labels.get(value) ?? value, count: 0 }
    );
    if (!ordered) {
      return stable;
    }
    // A field with a natural order keeps it; values outside the list (if any) go last.
    const position = new Map(values.map(({ value }, index) => [value, index]));
    return [...stable].sort(
      (a, b) =>
        (position.get(a.value) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(b.value) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [values, selection, ordered, resetKey]);
};

interface FacetGroupProps {
  field: FacetField;
  values: FacetValue[];
  selection: FacetSelection;
  /** Stable across renders: the group is memoized and calls it with its field. */
  onFieldChange: (field: FacetField, next: FacetSelection) => void;
  initialIsOpen: boolean;
  resetKey: string;
  countsByMeaning?: boolean;
}

const FacetGroupComponent = ({
  field,
  values,
  selection,
  onFieldChange,
  initialIsOpen,
  resetKey,
  countsByMeaning,
}: FacetGroupProps) => {
  const onChange = (next: FacetSelection) => onFieldChange(field, next);
  const styles = usePanelStyles();
  const id = useGeneratedHtmlId({ prefix: `ruleFacetGroup-${field.id}` });
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const active = selection.include.length + selection.exclude.length;
  const stable = useStableValues(values, selection, field.ordered, resetKey);

  const term = search.trim().toLowerCase();
  const matching = term ? stable.filter(({ label }) => label.toLowerCase().includes(term)) : stable;
  const top = matching.slice(0, VISIBLE_VALUES);
  // A selected value further down the list stays visible when the list is short.
  const selectedBelow = matching
    .slice(VISIBLE_VALUES)
    .filter(({ value }) => selection.include.includes(value) || selection.exclude.includes(value));
  const visible = showAll || term ? matching : [...top, ...selectedBelow];

  return (
    <EuiAccordion
      id={id}
      css={styles.group}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={setIsOpen}
      paddingSize="none"
      buttonContent={
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{field.label}</strong>
            </EuiText>
          </EuiFlexItem>
          {active > 0 && (
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="accent">{active}</EuiNotificationBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      extraAction={
        active > 0 ? (
          <EuiButtonEmpty
            size="xs"
            flush="right"
            onClick={() => onChange({ include: [], exclude: [] })}
          >
            {i18n.CLEAR}
          </EuiButtonEmpty>
        ) : undefined
      }
      data-test-subj={`ruleFacetGroup-${field.id}`}
    >
      {/* Closed groups render nothing: the panel has many tag groups. */}
      {isOpen && (
        <div css={{ padding: '2px 0 6px' }}>
          {(field.searchable || ((showAll || term) && stable.length >= SEARCH_FROM)) && (
            <>
              <EuiFieldSearch
                compressed
                fullWidth
                placeholder={i18n.FIND_VALUE(field.label)}
                aria-label={i18n.FIND_VALUE(field.label)}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <EuiSpacer size="xs" />
            </>
          )}
          {visible.length === 0 ? (
            <EuiText size="xs" color="subdued">
              {i18n.NO_VALUES}
            </EuiText>
          ) : (
            visible.map((value) => (
              <FacetValueRow
                key={value.value}
                field={field}
                value={value}
                selection={selection}
                onChange={onChange}
                styles={styles}
                countsByMeaning={countsByMeaning}
              />
            ))
          )}
          {!term && matching.length > VISIBLE_VALUES && (
            <EuiButtonEmpty size="xs" flush="left" onClick={() => setShowAll(!showAll)}>
              {showAll ? i18n.SHOW_LESS : i18n.SHOW_ALL(matching.length)}
            </EuiButtonEmpty>
          )}
        </div>
      )}
    </EuiAccordion>
  );
};

const sameSelection = (a: FacetSelection, b: FacetSelection) =>
  a.include.join('\n') === b.include.join('\n') && a.exclude.join('\n') === b.exclude.join('\n');

/** Only the clicked group renders on a click; the others keep their output. */
const FacetGroup = React.memo(
  FacetGroupComponent,
  (prev, next) =>
    prev.field.id === next.field.id &&
    prev.values === next.values &&
    prev.resetKey === next.resetKey &&
    prev.onFieldChange === next.onFieldChange &&
    sameSelection(prev.selection, next.selection)
);

const SECTION_TITLES: Record<FacetSection, string | undefined> = {
  rule: undefined,
  state: i18n.RULE_STATE,
  tags: i18n.TAGS,
};

export interface FacetPanelProps {
  conditions: RuleSetConditions;
  onChange: (next: RuleSetConditions) => void;
  counts: FacetCountsResult | undefined;
  isLoading: boolean;
  /** New counts are loading: the old ones stay, dimmed. */
  isFetching?: boolean;
  /** The scope of the counts (a rule set id); a new scope resets the order of the values. */
  scopeKey?: string;
}

/**
 * Facets of rule fields, rule state and tag categories, with counts. The rules table and the rule
 * set editor both use it, so a field added to the field list appears in both.
 */
export const FacetPanel = ({
  conditions,
  onChange,
  counts,
  isLoading,
  isFetching = false,
  scopeKey = '',
}: FacetPanelProps) => {
  const styles = usePanelStyles();
  const integrationTitles = useIntegrationTitles();
  const { techniques, subtechniques } = useMitreConfiguration({
    types: ['technique', 'subtechnique'],
  });
  const techniqueTitles = useMemo(
    () => new Map([...techniques, ...subtechniques].map(({ id, name }) => [id, `${id} · ${name}`])),
    [techniques, subtechniques]
  );
  const [showAllTagGroups, setShowAllTagGroups] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const fields = useMemo(() => allFacetFields(counts, conditions), [counts, conditions]);

  // The latest conditions and callback, so the handler passed to the memoized groups never changes.
  const latest = useRef({ conditions, onChange });
  latest.current = { conditions, onChange };
  const onFieldChange = useCallback(
    (field: FacetField, next: FacetSelection) =>
      latest.current.onChange(field.set(latest.current.conditions, next)),
    []
  );

  // Values depend on the counts only, so a click does not rebuild them for every group.
  const valuesById = useMemo(() => {
    const byId = new Map<string, FacetValue[]>();
    if (counts) {
      fields.forEach((field) =>
        byId.set(field.id, field.values(counts, { integrationTitles, techniqueTitles }))
      );
    }
    return byId;
  }, [counts, fields, integrationTitles, techniqueTitles]);
  const valuesOf = (field: FacetField) => valuesById.get(field.id) ?? NO_VALUES;

  const labels = { integrationTitles, techniqueTitles };
  const searchMatches = findFilterMatches(filterSearch, fields, valuesById, conditions, labels);

  if (isLoading && !counts) {
    return <EuiSkeletonText lines={10} />;
  }

  const renderGroup = (field: FacetField) => {
    const selection = field.get(conditions);
    return (
      <FacetGroup
        key={`${scopeKey}-${field.id}`}
        field={field}
        values={valuesOf(field)}
        selection={selection}
        onFieldChange={onFieldChange}
        initialIsOpen={(field.section !== 'tags' && !field.searchable) || hasSelection(selection)}
        resetKey={scopeKey}
        countsByMeaning={counts?.byMeaning}
      />
    );
  };

  const tagFields = fields.filter(({ section }) => section === 'tags');
  const tagMatches = searchMatches
    ? undefined
    : findFilterMatches(tagSearch, tagFields, valuesById, conditions, labels, false);
  const shownTagFields = showAllTagGroups
    ? tagFields
    : tagFields.filter(
        (field, index) => index < VISIBLE_TAG_GROUPS || hasSelection(field.get(conditions))
      );
  const hiddenTagGroups = tagFields.length - shownTagFields.length;

  const renderMatches = (matches: ReturnType<typeof findFilterMatches>, tagsOnly = false) => {
    if (!matches) return null;
    return (
      <div data-test-subj={tagsOnly ? 'ruleFacetTagSearchResults' : 'ruleFacetSearchResults'}>
        {matches.total === 0 && (
          <EuiText size="xs" color="subdued" role="status">
            {tagsOnly ? i18n.NO_TAGS_MATCH : i18n.NO_FILTERS_MATCH}
          </EuiText>
        )}
        {matches.groups.map(({ field, selection, values }) => (
          <div key={field.id} data-test-subj={`ruleFacetSearchGroup-${field.id}`}>
            <EuiText size="xs" color="subdued">
              <strong>
                {!tagsOnly && field.section === 'tags' && field.id !== 'tags' && `${i18n.TAGS} · `}
                {field.label}
              </strong>
            </EuiText>
            {values.map((value) => (
              <FacetValueRow
                key={value.value}
                field={field}
                value={value}
                selection={selection}
                onChange={(next) => onFieldChange(field, next)}
                styles={styles}
                countsByMeaning={counts?.byMeaning}
              />
            ))}
            <EuiSpacer size="xs" />
          </div>
        ))}
        {matches.total > MAX_FILTER_MATCHES && (
          <EuiText size="xs" color="subdued">
            {i18n.MORE_FILTER_MATCHES(matches.total - MAX_FILTER_MATCHES)}
          </EuiText>
        )}
      </div>
    );
  };

  return (
    <div css={isFetching ? styles.updating : undefined} data-test-subj="ruleFacetPanel">
      <EuiFieldSearch
        compressed
        fullWidth
        isClearable
        placeholder={i18n.FIND_FILTERS}
        aria-label={i18n.FIND_FILTERS}
        value={filterSearch}
        onChange={(event) => setFilterSearch(event.target.value)}
        data-test-subj="ruleFacetSearch"
      />
      <EuiSpacer size="xs" />
      {renderMatches(searchMatches)}
      <div hidden={Boolean(searchMatches)}>
        {fields.filter(({ section }) => section === 'rule').map(renderGroup)}

        <div css={styles.section}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{SECTION_TITLES.state}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip content={i18n.RULE_STATE_HELP} type="info" size="s" color="subdued" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        {fields.filter(({ section }) => section === 'state').map(renderGroup)}

        <div css={styles.section}>{SECTION_TITLES.tags}</div>
        <EuiFieldSearch
          compressed
          fullWidth
          isClearable
          placeholder={i18n.FIND_TAG}
          aria-label={i18n.FIND_TAG}
          value={tagSearch}
          onChange={(event) => setTagSearch(event.target.value)}
          data-test-subj="ruleFacetTagSearch"
        />
        <EuiSpacer size="xs" />
        {renderMatches(tagMatches, true)}
        <div hidden={Boolean(tagMatches)}>
          {shownTagFields.map(renderGroup)}
          {(hiddenTagGroups > 0 || showAllTagGroups) && (
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType={showAllTagGroups ? 'chevronSingleUp' : 'chevronSingleDown'}
              onClick={() => setShowAllTagGroups(!showAllTagGroups)}
              data-test-subj="ruleFacetMoreTagGroups"
            >
              {showAllTagGroups ? i18n.FEWER_TAG_GROUPS : i18n.MORE_TAG_GROUPS(hiddenTagGroups)}
            </EuiButtonEmpty>
          )}
        </div>
      </div>
    </div>
  );
};

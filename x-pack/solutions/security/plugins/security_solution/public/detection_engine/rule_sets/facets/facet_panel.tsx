/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import type { FacetCountsResult, FacetField, FacetSelection, FacetValue } from './facet_fields';
import { allFacetFields, hasSelection } from './facet_fields';
import { useIntegrationTitles } from '../components/group_by_fields';
import * as i18n from './translations';

const VISIBLE_VALUES = 5;
const SEARCH_FROM = 10;

const useRowStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    row: css`
      padding: 1px ${euiTheme.size.xs};
      border-radius: ${euiTheme.border.radius.small};
      &:hover {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }
      .ruleFacetExclude {
        opacity: 0;
      }
      &:hover .ruleFacetExclude,
      &:focus-within .ruleFacetExclude,
      .ruleFacetExclude[aria-pressed='true'] {
        opacity: 1;
      }
    `,
    excluded: css`
      text-decoration: line-through;
      color: ${euiTheme.colors.textSubdued};
    `,
    empty: css`
      color: ${euiTheme.colors.textDisabled};
    `,
  };
};

const FacetValueRow = ({
  field,
  value,
  selection,
  onChange,
}: {
  field: FacetField;
  value: FacetValue;
  selection: FacetSelection;
  onChange: (next: FacetSelection) => void;
}) => {
  const styles = useRowStyles();
  const id = useGeneratedHtmlId({ prefix: `ruleFacet-${field.id}` });
  const isIncluded = selection.include.includes(value.value);
  const isExcluded = selection.exclude.includes(value.value);
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

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      css={styles.row}
      data-test-subj={`ruleFacetValue-${field.id}-${value.value}`}
    >
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiCheckbox
          id={id}
          checked={isIncluded}
          onChange={toggleInclude}
          label={
            <EuiText
              size="s"
              className="eui-textTruncate"
              title={value.label}
              css={[
                isExcluded && styles.excluded,
                value.count === 0 && !isIncluded && styles.empty,
              ]}
            >
              {value.label}
            </EuiText>
          }
        />
      </EuiFlexItem>
      {isExcluded && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">{i18n.NOT}</EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {value.count}
        </EuiText>
      </EuiFlexItem>
      {field.canExclude && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={isExcluded ? i18n.UNDO_EXCLUDE(value.label) : i18n.EXCLUDE(value.label)}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              className="ruleFacetExclude"
              iconType={isExcluded ? 'cross' : 'minusCircle'}
              size="xs"
              color={isExcluded ? 'danger' : 'text'}
              aria-pressed={isExcluded}
              aria-label={isExcluded ? i18n.UNDO_EXCLUDE(value.label) : i18n.EXCLUDE(value.label)}
              onClick={toggleExclude}
              data-test-subj={`ruleFacetExclude-${field.id}-${value.value}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/** Selected values first, then by count, so a choice never scrolls out of view. */
const sortValues = (values: FacetValue[], selection: FacetSelection) => {
  const selected = new Set([...selection.include, ...selection.exclude]);
  return [...values].sort(
    (a, b) =>
      Number(selected.has(b.value)) - Number(selected.has(a.value)) ||
      b.count - a.count ||
      a.label.localeCompare(b.label)
  );
};

export const FacetGroup = ({
  field,
  values,
  selection,
  onChange,
  initialIsOpen,
}: {
  field: FacetField;
  values: FacetValue[];
  selection: FacetSelection;
  onChange: (next: FacetSelection) => void;
  initialIsOpen: boolean;
}) => {
  const id = useGeneratedHtmlId({ prefix: `ruleFacetGroup-${field.id}` });
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const active = selection.include.length + selection.exclude.length;

  // A selected value with no rules under the other filters stays visible.
  const withSelected = useMemo(() => {
    const known = new Set(values.map(({ value }) => value));
    const missing = [...selection.include, ...selection.exclude]
      .filter((value) => !known.has(value))
      .map((value) => ({ value, label: value, count: 0 }));
    return field.ordered ? [...values, ...missing] : sortValues([...values, ...missing], selection);
  }, [field.ordered, values, selection]);

  const term = search.trim().toLowerCase();
  const matching = term
    ? withSelected.filter(({ label }) => label.toLowerCase().includes(term))
    : withSelected;
  const visible = showAll || term ? matching : matching.slice(0, VISIBLE_VALUES);

  return (
    <EuiAccordion
      id={id}
      initialIsOpen={initialIsOpen}
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
              <EuiNotificationBadge color="subdued">{active}</EuiNotificationBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      extraAction={
        active > 0 ? (
          <EuiButtonEmpty size="xs" onClick={() => onChange({ include: [], exclude: [] })}>
            {i18n.CLEAR}
          </EuiButtonEmpty>
        ) : undefined
      }
      data-test-subj={`ruleFacetGroup-${field.id}`}
    >
      <div css={{ padding: '2px 0 8px' }}>
        {(showAll || term) && withSelected.length >= SEARCH_FROM && (
          <>
            <EuiFieldSearch
              compressed
              fullWidth
              placeholder={i18n.FIND_VALUE(field.label)}
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
            />
          ))
        )}
        {!term && matching.length > VISIBLE_VALUES && (
          <EuiButtonEmpty size="xs" flush="left" onClick={() => setShowAll(!showAll)}>
            {showAll ? i18n.SHOW_LESS : i18n.SHOW_ALL(matching.length)}
          </EuiButtonEmpty>
        )}
      </div>
    </EuiAccordion>
  );
};

export interface FacetPanelProps {
  conditions: RuleSetConditions;
  onChange: (next: RuleSetConditions) => void;
  counts: FacetCountsResult | undefined;
  isLoading: boolean;
  /** Extra sections below the rule fields, for example rule state filters of the table. */
  children?: React.ReactNode;
}

/**
 * Facets of rule fields and tag categories, with counts. The rules table and the rule set editor
 * both use it, so a field added to the field list appears in both.
 */
export const FacetPanel = ({
  conditions,
  onChange,
  counts,
  isLoading,
  children,
}: FacetPanelProps) => {
  const integrationTitles = useIntegrationTitles();
  const fields = allFacetFields(counts, conditions);
  const selections = fields.map((field) => [field, field.get(conditions)] as const);
  const hasAny = selections.some(([, selection]) => hasSelection(selection));

  return (
    <div data-test-subj="ruleFacetPanel">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{i18n.FILTERS}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {hasAny && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={() =>
                onChange({ ...(conditions.search ? { search: conditions.search } : {}) })
              }
              data-test-subj="ruleFacetClearAll"
            >
              {i18n.CLEAR_ALL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isLoading && !counts ? (
        <EuiSkeletonText lines={8} />
      ) : (
        selections.map(([field, selection], index) => {
          const isTag = field.id.startsWith('tag:') || field.id === 'tags';
          const isFirstTag = isTag && !selections[index - 1]?.[0].id.match(/^(tag:|tags$)/);
          return (
            <React.Fragment key={field.id}>
              {isFirstTag && (
                <>
                  <EuiHorizontalRule margin="s" />
                  <EuiText size="xs" color="subdued">
                    <strong>{i18n.TAGS}</strong>
                  </EuiText>
                  <EuiSpacer size="xs" />
                </>
              )}
              <FacetGroup
                field={field}
                values={counts ? field.values(counts, { integrationTitles }) : []}
                selection={selection}
                onChange={(next) => onChange(field.set(conditions, next))}
                initialIsOpen={!isTag || hasSelection(selection)}
              />
            </React.Fragment>
          );
        })
      )}
      {children}
    </div>
  );
};

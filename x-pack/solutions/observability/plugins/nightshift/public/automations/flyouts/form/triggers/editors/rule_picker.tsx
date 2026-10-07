/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiNotificationBadge,
  EuiSelectable,
  EuiSpacer,
  EuiSuperSelect,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { useDebouncedValue } from '@kbn/react-hooks';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { useGetRuleTagsQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useRuleSuggestions } from '../../../../../hooks/use_rule_suggestions';
import type { TriggerFormValues } from '../../automation_form_values';
import { rulePickerLabels } from '../translations';

type AlertTrigger = Extract<TriggerFormValues, { kind: 'alert' }>;
type PickerView = 'rules' | 'tags' | 'selected';

type OptionData =
  | { kind: 'rule'; name: string; tags: string[]; viaTags: string[] }
  | { kind: 'tag'; tag: string };

type PickerOption = EuiSelectableOption<OptionData>;

const SEARCH_DEBOUNCE_MS = 300;
const PANEL_WIDTH = 440;
const LIST_MAX_HEIGHT = 320;
const TAG_FILTER_WIDTH = 150;
const ALL_TAGS_VALUE = '__all__';
const MAX_TAGS = 50;

const unique = (values: string[]) => [...new Set(values)];

export const RulePicker = ({
  trigger,
  onChange,
}: {
  trigger: AlertTrigger;
  onChange: (trigger: TriggerFormValues) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { http, notifications } = useKibana().services;
  const { ruleNames, ruleTags } = trigger;
  const [view, setView] = useState<PickerView>('rules');
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [snapshot, setSnapshot] = useState({ ruleNames, ruleTags });
  const knownRuleTags = useRef(new Map<string, string[]>());

  const trimmedQuery = query.trim();
  const search = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);
  const q = trimmedQuery.toLowerCase();

  const { data: allRules } = useRuleSuggestions('', '');
  const { data: foundRules } = useRuleSuggestions(view === 'rules' ? search : '', tagFilter);
  const { tags } = useGetRuleTagsQuery({
    enabled: true,
    search: view === 'tags' ? search : '',
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS,
    perPage: MAX_TAGS,
    http,
    toasts: notifications.toasts,
  });

  [...(allRules?.rules ?? []), ...(foundRules?.rules ?? [])].forEach((rule) =>
    knownRuleTags.current.set(rule.name, rule.tags)
  );

  const totalRules = allRules?.total ?? 0;
  const selectedCount = ruleNames.length + ruleTags.length;

  const commit = (next: { ruleNames: string[]; ruleTags: string[] }) =>
    onChange({ ...trigger, ruleNames: unique(next.ruleNames), ruleTags: unique(next.ruleTags) });

  const toggleRule = (name: string, checked: boolean) =>
    commit({
      ruleNames: checked ? [...ruleNames, name] : ruleNames.filter((entry) => entry !== name),
      ruleTags,
    });

  const toggleTag = (tag: string, checked: boolean) =>
    commit({
      ruleNames,
      ruleTags: checked ? [...ruleTags, tag] : ruleTags.filter((entry) => entry !== tag),
    });

  const ruleOption = (name: string, ruleTagsOfRule: string[]): PickerOption => {
    const viaTags = ruleTagsOfRule.filter((tag) => ruleTags.includes(tag));
    return {
      key: `rule-${name}`,
      label: name,
      searchableLabel: [name, ...ruleTagsOfRule].join(' '),
      kind: 'rule',
      name,
      tags: ruleTagsOfRule,
      viaTags,
      checked: viaTags.length > 0 || ruleNames.includes(name) ? 'on' : undefined,
      disabled: viaTags.length > 0,
      toolTipContent:
        viaTags.length > 0 ? rulePickerLabels.includedByTag(viaTags.join(', ')) : undefined,
    };
  };

  const tagOption = (tag: string): PickerOption => ({
    key: `tag-${tag}`,
    label: tag,
    kind: 'tag',
    tag,
    checked: ruleTags.includes(tag) ? 'on' : undefined,
  });

  const matches = (...values: string[]) =>
    !q || values.some((value) => value.toLowerCase().includes(q));

  const buildSelectedOptions = (): PickerOption[] => {
    const tagRows = unique([...snapshot.ruleTags, ...ruleTags])
      .filter((tag) => matches(tag))
      .map(tagOption);
    const ruleRows = unique([...snapshot.ruleNames, ...ruleNames])
      .map((name) => ({ name, tags: knownRuleTags.current.get(name) ?? [] }))
      .filter(({ name, tags: ruleTagsOfRule }) => matches(name, ...ruleTagsOfRule))
      .map(({ name, tags: ruleTagsOfRule }) => ruleOption(name, ruleTagsOfRule));
    return [
      ...(tagRows.length
        ? [
            {
              key: 'group-tags',
              label: rulePickerLabels.tagsGroup,
              isGroupLabel: true,
            } as PickerOption,
            ...tagRows,
          ]
        : []),
      ...(ruleRows.length
        ? [
            {
              key: 'group-rules',
              label: rulePickerLabels.rulesGroup(
                ruleRows.filter(({ checked }) => checked === 'on').length
              ),
              isGroupLabel: true,
            } as PickerOption,
            ...ruleRows,
          ]
        : []),
    ];
  };

  const options: PickerOption[] =
    view === 'tags'
      ? tags.map(tagOption)
      : view === 'selected'
      ? buildSelectedOptions()
      : (foundRules?.rules ?? []).map(({ name, tags: ruleTagsOfRule }) =>
          ruleOption(name, ruleTagsOfRule)
        );

  const shownRuleNames =
    view === 'rules'
      ? options.flatMap((option) =>
          option.kind === 'rule' && option.viaTags.length === 0 ? [option.name] : []
        )
      : [];
  const allShownSelected =
    shownRuleNames.length > 0 && shownRuleNames.every((name) => ruleNames.includes(name));
  const filterTagSelected = Boolean(tagFilter) && ruleTags.includes(tagFilter);
  const showTagBulkAction = view === 'rules' && Boolean(tagFilter) && !q;
  const showShownBulkAction = view === 'rules' && Boolean(q) && shownRuleNames.length > 0;
  const hasSelection = selectedCount > 0;
  const showFooter = hasSelection || showTagBulkAction || showShownBulkAction;

  const toggleShown = () =>
    commit({
      ruleNames: allShownSelected
        ? ruleNames.filter((name) => !shownRuleNames.includes(name))
        : [...ruleNames, ...shownRuleNames],
      ruleTags,
    });

  const switchView = (next: PickerView) => {
    if (next === 'selected') setSnapshot({ ruleNames, ruleTags });
    setView(next);
  };

  const summary = [
    ruleNames.length > 0 || ruleTags.length === 0
      ? rulePickerLabels.ruleCount(ruleNames.length)
      : null,
    ruleTags.length > 0 ? rulePickerLabels.tagCount(ruleTags.length) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const searchPlaceholder =
    view === 'tags'
      ? rulePickerLabels.searchTags(tags.length)
      : view === 'selected'
      ? rulePickerLabels.searchSelected
      : rulePickerLabels.searchRules(totalRules);

  const emptyMessage =
    view === 'selected' && !q
      ? rulePickerLabels.nothingSelected
      : view === 'rules' && tagFilter && !q
      ? rulePickerLabels.noRulesWithTag(tagFilter)
      : rulePickerLabels.noMatch(
          view === 'tags' ? 'tags' : 'rules',
          trimmedQuery,
          view === 'rules' ? tagFilter : ''
        );

  const tabs: Array<{ id: PickerView; label: string; count: number }> = [
    { id: 'rules', label: rulePickerLabels.rulesTab, count: totalRules },
    { id: 'tags', label: rulePickerLabels.tagsTab, count: tags.length },
    { id: 'selected', label: rulePickerLabels.selectedTab, count: selectedCount },
  ];

  const renderOption = (option: PickerOption) => {
    if (option.kind === 'tag') {
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="tag" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem className="eui-textTruncate">
            <EuiHighlight search={trimmedQuery}>{option.tag}</EuiHighlight>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (option.kind !== 'rule') return null;
    const bySpecificity = (a: string, b: string) => a.localeCompare(b);
    const shown = option.viaTags.length
      ? [...option.viaTags].sort(bySpecificity)
      : [...option.tags].sort(bySpecificity).slice(0, 1);
    const hiddenCount = option.tags.length - shown.length;
    return (
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        css={{ inlineSize: '100%' }}
      >
        <EuiFlexItem css={{ minInlineSize: 0 }}>
          <div className="eui-textTruncate" title={option.name}>
            <EuiHighlight search={trimmedQuery}>{option.name}</EuiHighlight>
          </div>
        </EuiFlexItem>
        {option.tags.length > 0 ? (
          <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
            <EuiToolTip content={rulePickerLabels.ruleTags(option.tags.join(', '))} position="left">
              <EuiBadgeGroup gutterSize="xs" css={{ flexWrap: 'nowrap' }}>
                {shown.map((tag) => {
                  const isVia = option.viaTags.includes(tag);
                  return (
                    <EuiBadge
                      key={tag}
                      color={isVia ? 'primary' : 'hollow'}
                      iconType={isVia ? 'check' : undefined}
                    >
                      {tag}
                    </EuiBadge>
                  );
                })}
                {hiddenCount > 0 ? <EuiBadge color="hollow">+{hiddenCount}</EuiBadge> : null}
              </EuiBadgeGroup>
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };

  const tagFilterOptions = [
    { value: ALL_TAGS_VALUE, label: rulePickerLabels.allTags },
    ...tags.map((tag) => ({ value: tag, label: tag })),
  ].map(({ value, label }) => ({
    value,
    inputDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="tag" size="s" color="subdued" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem className="eui-textTruncate">{label}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="tag" color="subdued" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem className="eui-textTruncate">{label}</EuiFlexItem>
      </EuiFlexGroup>
    ),
  }));

  return (
    <div
      css={{ inlineSize: PANEL_WIDTH, maxInlineSize: '90vw' }}
      data-test-subj="automationRulePickerPanel"
    >
      <div css={css({ padding: `${euiTheme.size.s} ${euiTheme.size.m} 0` })}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              compressed
              fullWidth
              autoFocus
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={rulePickerLabels.searchAriaLabel}
              data-test-subj="automationRulePickerSearch"
            />
          </EuiFlexItem>
          {view === 'rules' && tags.length > 0 ? (
            <EuiFlexItem grow={false} css={{ inlineSize: TAG_FILTER_WIDTH }}>
              <EuiSuperSelect
                compressed
                fullWidth
                aria-label={rulePickerLabels.filterByTag}
                valueOfSelected={tagFilter || ALL_TAGS_VALUE}
                onChange={(value) => setTagFilter(value === ALL_TAGS_VALUE ? '' : value)}
                options={tagFilterOptions}
                popoverProps={{ panelMinWidth: 180 }}
                data-test-subj="automationRuleTagFilter"
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiTabs size="s" bottomBorder={false}>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={view === tab.id}
              onClick={() => switchView(tab.id)}
              append={
                <EuiNotificationBadge
                  color={tab.id === 'selected' && tab.count > 0 ? 'accent' : 'subdued'}
                >
                  {tab.count}
                </EuiNotificationBadge>
              }
              data-test-subj={`automationRulePickerTab-${tab.id}`}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </div>

      {view === 'tags' ? (
        <EuiText
          size="xs"
          color="subdued"
          css={css({ padding: `${euiTheme.size.s} ${euiTheme.size.m} 0` })}
        >
          {rulePickerLabels.tagsHelp}
        </EuiText>
      ) : null}

      <EuiSelectable<OptionData>
        key={view}
        aria-label={view === 'tags' ? rulePickerLabels.tagsList : rulePickerLabels.rulesList}
        options={options}
        listProps={{
          isVirtualized: false,
          bordered: false,
          onFocusBadge: false,
          showIcons: true,
          textWrap: 'wrap',
          paddingSize: 's',
        }}
        renderOption={(option) => renderOption(option as PickerOption)}
        emptyMessage={
          <EuiText size="xs" color="subdued">
            {emptyMessage}
          </EuiText>
        }
        onChange={(_next, _event, changed) => {
          const isOn = changed.checked === 'on';
          if (changed.kind === 'tag') toggleTag(changed.tag, isOn);
          else if (changed.kind === 'rule') toggleRule(changed.name, isOn);
        }}
      >
        {(list) => <div css={{ maxBlockSize: LIST_MAX_HEIGHT, overflowY: 'auto' }}>{list}</div>}
      </EuiSelectable>

      {showFooter ? (
        <div
          css={css({
            borderBlockStart: euiTheme.border.thin,
            padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
          })}
        >
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" aria-live="polite">
                {hasSelection ? (
                  <>
                    {summary}
                    {' · '}
                    <EuiButtonEmpty
                      size="xs"
                      flush="both"
                      onClick={() => commit({ ruleNames: [], ruleTags: [] })}
                      data-test-subj="automationRuleClear"
                    >
                      {rulePickerLabels.clear}
                    </EuiButtonEmpty>
                  </>
                ) : null}
              </EuiText>
            </EuiFlexItem>
            {showTagBulkAction ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  flush="right"
                  iconType={filterTagSelected ? 'cross' : 'tag'}
                  onClick={() => toggleTag(tagFilter, !filterTagSelected)}
                  data-test-subj="automationRuleSelectFilterTag"
                >
                  {filterTagSelected
                    ? rulePickerLabels.removeTag(tagFilter)
                    : rulePickerLabels.selectTag(tagFilter)}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : showShownBulkAction ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  flush="right"
                  onClick={toggleShown}
                  data-test-subj="automationRuleSelectShown"
                >
                  {allShownSelected
                    ? rulePickerLabels.deselectShown(shownRuleNames.length)
                    : rulePickerLabels.selectShown(shownRuleNames.length)}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </div>
      ) : null}
    </div>
  );
};

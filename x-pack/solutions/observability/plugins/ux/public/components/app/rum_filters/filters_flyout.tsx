/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiInlineEditText,
  EuiNotificationBadge,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  BOT_UA_PARAM_MAX,
  BOT_UA_TOKENS,
  botUaSearchValue,
  formatBotUaTokens,
  isDefaultBotUaTokens,
  parseBotUaTokens,
  tryParseBotUaTokens,
} from '../../../../common/rum_app';
import type { FacetFilterValue } from '../../../../common/rum_filters';
import {
  formatFilterValues,
  parseFilterValues,
  setFilterValue,
} from '../../../../common/rum_filters';
import type { RumFilterPatch } from '../../../utils/rum_search';
import { useUxFlyoutSession, uxFlyoutProps } from '../../flyout/ux_flyout_props';
import { FacetOptionRow } from './facet_option_row';
import {
  customPlaceholderFor,
  FACET_FILTER_IDS,
  FACET_PREVIEW_SIZE,
  filterName,
  PINNED_FILTER_IDS,
  withSelectedOptions,
  type RumFacetFilterId,
  type RumFilterOption,
  type RumOtelFilterId,
} from './filter_defs';

const FLYOUT_TITLE = i18n.translate('xpack.ux.filters.flyoutTitle', {
  defaultMessage: 'All filters',
});

interface FilterDraft {
  facets: Record<RumFacetFilterId, FacetFilterValue[]>;
  includeBots: boolean;
  botTokens: string[];
}

const emptyFacets = (): Record<RumFacetFilterId, FacetFilterValue[]> => {
  const facets = {} as Record<RumFacetFilterId, FacetFilterValue[]>;
  for (const id of FACET_FILTER_IDS) {
    facets[id] = [];
  }
  return facets;
};

const draftFromValues = (
  values: Record<RumOtelFilterId, string | undefined>,
  botUa?: string
): FilterDraft => {
  const facets = emptyFacets();
  for (const id of FACET_FILTER_IDS) {
    facets[id] = parseFilterValues(values[id]);
  }
  return {
    facets,
    includeBots: values.includeBots === 'true',
    botTokens: parseBotUaTokens(botUa),
  };
};

const emptyDraft = (): FilterDraft => ({
  facets: emptyFacets(),
  includeBots: false,
  botTokens: [...BOT_UA_TOKENS],
});

const selectedCountOf = (draft: FilterDraft): number =>
  FACET_FILTER_IDS.reduce((sum, id) => sum + draft.facets[id].length, 0) +
  (draft.includeBots ? 1 : 0);

const draftIsDirty = (
  draft: FilterDraft,
  values: Record<RumOtelFilterId, string | undefined>,
  botUa?: string
): boolean => {
  const applied = draftFromValues(values, botUa);
  if (draft.includeBots !== applied.includeBots) {
    return true;
  }
  if (botUaSearchValue(draft.botTokens) !== botUaSearchValue(applied.botTokens)) {
    return true;
  }
  return FACET_FILTER_IDS.some(
    (id) => formatFilterValues(draft.facets[id]) !== formatFilterValues(applied.facets[id])
  );
};

const BotKeywordsEditor = ({
  tokens,
  onChange,
}: {
  tokens: string[];
  onChange: (tokens: string[]) => void;
}) => {
  const [value, setValue] = useState(() => formatBotUaTokens(tokens));
  const customized = !isDefaultBotUaTokens(tokens);

  useEffect(() => {
    setValue(formatBotUaTokens(tokens));
  }, [tokens]);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.ux.filters.botKeywordsLabel', {
                defaultMessage: 'Bot keywords',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        {customized ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="left"
              onClick={() => onChange([...BOT_UA_TOKENS])}
              data-test-subj="uxOtelFiltersBotKeywordsReset"
            >
              {i18n.translate('xpack.ux.filters.resetBotKeywordsButtonLabel', {
                defaultMessage: 'Reset',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiInlineEditText
        size="xs"
        inputAriaLabel={i18n.translate('xpack.ux.filters.botKeywordsAriaLabel', {
          defaultMessage: 'Edit bot user-agent keywords',
        })}
        value={value}
        onChange={(event) => {
          const next = 'value' in event.target ? event.target.value : '';
          setValue(typeof next === 'string' ? next : '');
        }}
        onCancel={() => setValue(formatBotUaTokens(tokens))}
        onSave={(next) => {
          const parsed = tryParseBotUaTokens(next);
          if (!parsed) {
            return false;
          }
          onChange(parsed);
          setValue(formatBotUaTokens(parsed));
          return true;
        }}
        editModeProps={{
          inputProps: {
            maxLength: BOT_UA_PARAM_MAX,
            'data-test-subj': 'uxOtelFiltersBotKeywordsInput',
          },
        }}
        data-test-subj="uxOtelFiltersBotKeywords"
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.ux.filters.botKeywordsHelpText', {
          defaultMessage:
            'Comma-separated user-agent substrings. Traffic matching any keyword is excluded unless Include bots is on.',
        })}
      </EuiText>
    </>
  );
};

const FacetSection = ({
  id,
  options,
  selected,
  onToggle,
  onExclude,
  onClear,
  onAddCustom,
}: {
  id: RumFacetFilterId;
  options: RumFilterOption[];
  selected: FacetFilterValue[];
  onToggle: (key: string) => void;
  onExclude: (key: string) => void;
  onClear: () => void;
  onAddCustom?: (value: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');
  const [showAll, setShowAll] = useState(false);
  const accordionId = useGeneratedHtmlId({ prefix: `uxOtelFiltersFacet-${id}` });
  const selectedKeys = useMemo(() => selected.map((item) => item.value), [selected]);
  const excludedKeys = useMemo(
    () => new Set(selected.filter((item) => item.exclude).map((item) => item.value)),
    [selected]
  );
  const includedKeys = useMemo(
    () => new Set(selected.filter((item) => !item.exclude).map((item) => item.value)),
    [selected]
  );
  const listed = useMemo(() => withSelectedOptions(options, selectedKeys), [options, selectedKeys]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return listed;
    }
    return listed.filter((option) => (option.label ?? option.key).toLowerCase().includes(needle));
  }, [listed, query]);
  const columns = id === 'pageUrl' ? 1 : 2;
  const previewSize = columns === 1 ? FACET_PREVIEW_SIZE : FACET_PREVIEW_SIZE + 4;
  const isTruncated = query.trim().length === 0 && !showAll && visible.length > previewSize;
  const shown = isTruncated ? visible.slice(0, previewSize) : visible;
  const hiddenCount = visible.length - shown.length;

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen={selected.length > 0 || (PINNED_FILTER_IDS as readonly string[]).includes(id)}
      paddingSize="m"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>{filterName(id)}</EuiFlexItem>
          {selected.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={excludedKeys.size === selected.length ? 'danger' : 'hollow'}
                data-test-subj={`uxOtelFiltersFacetSelected-${id}`}
              >
                {excludedKeys.size === selected.length
                  ? i18n.translate('xpack.ux.filters.excludedCountBadgeLabel', {
                      defaultMessage: 'not {count}',
                      values: { count: selected.length },
                    })
                  : selected.length}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge
              color="subdued"
              aria-label={i18n.translate('xpack.ux.filters.facetValuesBadgeAriaLabel', {
                defaultMessage: '{count, plural, one {# unique value} other {# unique values}}',
                values: { count: listed.length },
              })}
            >
              {listed.length}
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        selected.length > 0 ? (
          <EuiButtonEmpty
            size="xs"
            flush="right"
            onClick={(event: React.SyntheticEvent) => {
              event.stopPropagation();
              onClear();
            }}
            data-test-subj={`uxOtelFiltersFacetClear-${id}`}
          >
            {i18n.translate('xpack.ux.filters.clearFacetButtonLabel', { defaultMessage: 'Clear' })}
          </EuiButtonEmpty>
        ) : undefined
      }
      data-test-subj={`uxOtelFiltersFacet-${id}`}
    >
      {onAddCustom && (
        <>
          <EuiFieldSearch
            compressed
            placeholder={customPlaceholderFor(id)}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onSearch={(next) => {
              const trimmed = next.trim();
              if (trimmed) {
                onAddCustom(trimmed);
                setCustom('');
              }
            }}
            isClearable
            data-test-subj="uxOtelFiltersCustomPath"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {listed.length > FACET_PREVIEW_SIZE && (
        <>
          <EuiFieldSearch
            compressed
            placeholder={i18n.translate('xpack.ux.filters.searchFacetPlaceholder', {
              defaultMessage: 'Search {facet}',
              values: { facet: filterName(id) },
            })}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            isClearable
            data-test-subj={`uxOtelFiltersFacetSearch-${id}`}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {visible.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.ux.filters.noFacetValuesLabel', {
            defaultMessage: 'No values in this range',
          })}
        </EuiText>
      ) : (
        <EuiFlexGrid
          columns={columns}
          gutterSize="s"
          responsive={false}
          css={
            columns > 1
              ? css`
                  column-gap: ${euiTheme.size.l};
                `
              : undefined
          }
        >
          {shown.map((option) => {
            const label = option.label ?? option.key;
            return (
              <EuiFlexItem key={option.key}>
                <FacetOptionRow
                  checkboxId={`uxOtelFilters-${id}-${encodeURIComponent(option.key)}`}
                  label={label}
                  count={option.count}
                  isIncluded={includedKeys.has(option.key)}
                  isExcluded={excludedKeys.has(option.key)}
                  onToggle={() => onToggle(option.key)}
                  onExclude={() => onExclude(option.key)}
                  testSubject={`uxOtelFiltersOption-${id}-${option.key}`}
                  excludeTestSubject={`uxOtelFiltersExclude-${id}-${option.key}`}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      )}
      {hiddenCount > 0 ? (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setShowAll(true)}
          data-test-subj={`uxOtelFiltersFacetMore-${id}`}
        >
          {i18n.translate('xpack.ux.filters.showMoreButtonLabel', {
            defaultMessage: 'Show {count} more',
            values: { count: hiddenCount },
          })}
        </EuiButtonEmpty>
      ) : null}
      {showAll && visible.length > previewSize && query.trim().length === 0 ? (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setShowAll(false)}
          data-test-subj={`uxOtelFiltersFacetLess-${id}`}
        >
          {i18n.translate('xpack.ux.filters.showLessButtonLabel', { defaultMessage: 'Show less' })}
        </EuiButtonEmpty>
      ) : null}
    </EuiAccordion>
  );
};

export function FiltersFlyout({
  optionSets,
  values,
  botUa,
  onApply,
  onClose,
}: {
  optionSets: Record<RumFacetFilterId, RumFilterOption[]>;
  values: Record<RumOtelFilterId, string | undefined>;
  botUa?: string;
  onApply: (patch: RumFilterPatch) => void;
  onClose: () => void;
}) {
  const session = useUxFlyoutSession();
  const titleId = useGeneratedHtmlId({ prefix: 'uxOtelFiltersFlyout' });
  const botsAccordionId = useGeneratedHtmlId({ prefix: 'uxOtelFiltersBots' });
  const [draft, setDraft] = useState<FilterDraft>(() => draftFromValues(values, botUa));
  const selectedCount = selectedCountOf(draft);
  const isDirty = draftIsDirty(draft, values, botUa);
  const canClear = selectedCount > 0 || !isDefaultBotUaTokens(draft.botTokens);
  const customBotTokens = !isDefaultBotUaTokens(draft.botTokens);

  const toggleValue = (id: RumFacetFilterId, key: string, exclude: boolean) => {
    setDraft((current) => ({
      ...current,
      facets: { ...current.facets, [id]: setFilterValue(current.facets[id], key, exclude) },
    }));
  };

  const apply = () => {
    const patch: RumFilterPatch = {
      includeBots: draft.includeBots ? 'true' : '',
      botUa: botUaSearchValue(draft.botTokens),
    };
    for (const id of FACET_FILTER_IDS) {
      patch[id] = formatFilterValues(draft.facets[id]);
    }
    onApply(patch);
    onClose();
  };

  return (
    <EuiFlyout
      {...uxFlyoutProps({ title: FLYOUT_TITLE, size: 'm', session })}
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="uxOtelFiltersFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.filters.flyoutDescription', {
              defaultMessage: 'Select values across facets, then apply them together.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiAccordion
          id={botsAccordionId}
          initialIsOpen={false}
          paddingSize="m"
          buttonContent={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.ux.filters.botsLabel', { defaultMessage: 'Bots' })}
              </EuiFlexItem>
              {draft.includeBots ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.ux.filters.botsIncludedBadgeLabel', {
                      defaultMessage: 'Included',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {customBotTokens ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.ux.filters.botsCustomBadgeLabel', {
                      defaultMessage: 'Custom',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          }
          data-test-subj="uxOtelFiltersBots"
        >
          <EuiSwitch
            label={i18n.translate('xpack.ux.filters.includeBotsSwitchLabel', {
              defaultMessage: 'Include bots',
            })}
            checked={draft.includeBots}
            onChange={(event) =>
              setDraft((current) => ({ ...current, includeBots: event.target.checked }))
            }
            compressed
            data-test-subj="uxOtelFiltersIncludeBots"
          />
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.filters.includeBotsHelpText', {
              defaultMessage: 'Known crawlers stay excluded unless this is on.',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <BotKeywordsEditor
            tokens={draft.botTokens}
            onChange={(botTokens) => setDraft((current) => ({ ...current, botTokens }))}
          />
        </EuiAccordion>
        <EuiSpacer size="m" />
        {FACET_FILTER_IDS.map((id) => (
          <FacetSection
            key={id}
            id={id}
            options={optionSets[id]}
            selected={draft.facets[id]}
            onToggle={(key) => toggleValue(id, key, false)}
            onExclude={(key) => toggleValue(id, key, true)}
            onClear={() =>
              setDraft((current) => ({
                ...current,
                facets: { ...current.facets, [id]: [] },
              }))
            }
            onAddCustom={
              id === 'pageUrl'
                ? (value) => {
                    setDraft((current) => ({
                      ...current,
                      facets: {
                        ...current.facets,
                        pageUrl: setFilterValue(current.facets.pageUrl, value, false),
                      },
                    }));
                  }
                : undefined
            }
          />
        ))}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              disabled={!canClear}
              onClick={() => setDraft(emptyDraft())}
              data-test-subj="uxOtelFiltersDraftClear"
            >
              {i18n.translate('xpack.ux.filters.clearDraftButtonLabel', {
                defaultMessage: 'Clear all',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose} data-test-subj="uxOtelFiltersCancel">
                  {i18n.translate('xpack.ux.filters.cancelButtonLabel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={apply}
                  disabled={!isDirty}
                  data-test-subj="uxOtelFiltersApply"
                >
                  {selectedCount === 0
                    ? i18n.translate('xpack.ux.filters.applyFiltersButtonLabel', {
                        defaultMessage: 'Apply filters',
                      })
                    : i18n.translate('xpack.ux.filters.applyButtonLabel', {
                        defaultMessage: 'Apply {count, plural, one {# filter} other {# filters}}',
                        values: { count: selectedCount },
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

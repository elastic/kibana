/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { RumFiltersResponse } from '../../../../common/rum_app';
import {
  formatFilterValues,
  parseFilterValues,
  setFilterValue as setFacetSelection,
} from '../../../../common/rum_filters';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumFilters } from '../../../services/rest/rum_api';
import { mergeRumSearch, type RumFilterPatch } from '../../../utils/rum_search';
import { FacetOptionRow } from './facet_option_row';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';
import { useSyncOpenWithTourStep } from '../rum_tour/use_sync_open_with_tour_step';
import {
  bucketsToOptions,
  customPlaceholderFor,
  excludedValueLabel,
  EXPANDABLE_FILTER_IDS,
  facetValueLabel,
  filterName,
  FILTER_IDS,
  firstSelectedLabel,
  FRUSTRATION_OPTIONS,
  labelFacetOptions,
  MENU_ONLY_FILTER_IDS,
  PINNED_FILTER_IDS,
  selectedFilterValues,
  truncateValue,
  withSelectedOptions,
  type RumFacetFilterId,
  type RumFilterOption,
  type RumOtelFilterId,
} from './filter_defs';
import { FiltersFlyout } from './filters_flyout';

const EMPTY: RumFiltersResponse = {
  browsers: [],
  os: [],
  pages: [],
  breakpoints: [],
  connections: [],
  devices: [],
  countries: [],
};

const multiValueLabel = (value: string, extraCount: number): string =>
  i18n.translate('xpack.ux.filters.multiValueButtonLabel', {
    defaultMessage: '{value} +{count}',
    values: { value, count: extraCount },
  });

const FilterOptionList = ({
  id,
  options,
  value,
  onChange,
  customPlaceholder,
}: {
  id: RumOtelFilterId;
  options: RumFilterOption[];
  value?: string;
  onChange: (next?: string) => void;
  customPlaceholder?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const selections = parseFilterValues(value);
  const included = new Set(selections.filter((item) => !item.exclude).map((item) => item.value));
  const excluded = new Set(selections.filter((item) => item.exclude).map((item) => item.value));
  const selectedKeys = selections.map((item) => item.value);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState(
    selectedKeys[0] && !options.some((option) => option.key === selectedKeys[0])
      ? selectedKeys[0]
      : ''
  );
  const listed = withSelectedOptions(options, selectedKeys);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return listed;
    }
    return listed.filter((option) => (option.label ?? option.key).toLowerCase().includes(needle));
  }, [listed, query]);

  const commit = (next: typeof selections) => {
    onChange(formatFilterValues(next) || undefined);
  };

  return (
    <div
      css={css`
        width: 280px;
        padding: ${euiTheme.size.s};
      `}
    >
      {customPlaceholder && (
        <>
          <EuiFieldSearch
            compressed
            placeholder={customPlaceholder}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onSearch={(next) => {
              const trimmed = next.trim();
              if (trimmed) {
                commit(setFacetSelection(selections, trimmed, false));
                setCustom('');
              }
            }}
            isClearable
            data-test-subj="uxOtelFilter-customPath"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {listed.length > 8 && (
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
            data-test-subj={`uxOtelFilterSearch-${id}`}
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
        <div
          css={css`
            max-height: 280px;
            overflow: auto;
          `}
        >
          {visible.map((option) => {
            const label = option.label ?? option.key;
            return (
              <FacetOptionRow
                key={option.key}
                checkboxId={`uxOtelFilter-${id}-${encodeURIComponent(option.key)}`}
                label={label}
                count={option.count}
                isIncluded={included.has(option.key)}
                isExcluded={excluded.has(option.key)}
                onToggle={() => commit(setFacetSelection(selections, option.key, false))}
                onExclude={() => commit(setFacetSelection(selections, option.key, true))}
                testSubject={`uxOtelFilterOption-${id}-${option.key}`}
                excludeTestSubject={`uxOtelFilterExclude-${id}-${option.key}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const FacetSelect = ({
  id,
  options,
  value,
  onChange,
}: {
  id: RumOtelFilterId;
  options: RumFilterOption[];
  value?: string;
  onChange: (next?: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const label = filterName(id);
  const selected = selectedFilterValues(value);
  const first = firstSelectedLabel(options, selected);
  const firstRaw = truncateValue(first ?? value ?? label, 28);
  const firstExcluded = parseFilterValues(value)[0]?.exclude === true;
  const firstLabel = firstExcluded ? excludedValueLabel(firstRaw) : firstRaw;
  const buttonLabel =
    selected.length > 1 ? multiValueLabel(firstLabel, selected.length - 1) : firstLabel;

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.ux.filters.facetAria', {
        defaultMessage: 'Filter by {label}',
        values: { label },
      })}
      panelPaddingSize="none"
      isOpen={open}
      closePopover={() => setOpen(false)}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          isSelected={open}
          onClick={() => setOpen((current) => !current)}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length || undefined}
          isDisabled={options.length === 0 && selected.length === 0 && id !== 'pageUrl'}
          grow={false}
          data-test-subj={`uxOtelFilter-${id}`}
        >
          {buttonLabel}
        </EuiFilterButton>
      }
    >
      <FilterOptionList
        id={id}
        options={options}
        value={value}
        customPlaceholder={customPlaceholderFor(id)}
        onChange={onChange}
      />
    </EuiPopover>
  );
};

const FilterPill = ({
  id,
  label,
  displayValue,
  options,
  value,
  onChange,
  onRemove,
}: {
  id: RumOtelFilterId;
  label: string;
  displayValue?: string;
  options: RumFilterOption[];
  value?: string;
  onChange: (next?: string) => void;
  onRemove: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const editable = id !== 'includeBots';
  const pillLabel = displayValue
    ? i18n.translate('xpack.ux.filters.appliedFilterLabel', {
        defaultMessage: '{filter}: {value}',
        values: { filter: label, value: displayValue },
      })
    : label;

  const badge = (
    <EuiBadge
      color="hollow"
      iconType="cross"
      iconSide="right"
      iconOnClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      iconOnClickAriaLabel={i18n.translate('xpack.ux.filters.removeFilterAriaLabel', {
        defaultMessage: 'Remove {filter} filter',
        values: { filter: label },
      })}
      onClick={
        editable
          ? () => {
              setOpen((current) => !current);
            }
          : onRemove
      }
      onClickAriaLabel={
        editable
          ? i18n.translate('xpack.ux.filters.editFilterAriaLabel', {
              defaultMessage: 'Edit {filter} filter',
              values: { filter: label },
            })
          : i18n.translate('xpack.ux.filters.removeFilterAriaLabel', {
              defaultMessage: 'Remove {filter} filter',
              values: { filter: label },
            })
      }
      data-test-subj={`uxOtelFilterPill-${id}`}
    >
      {pillLabel}
    </EuiBadge>
  );

  if (!editable) {
    return badge;
  }

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.ux.filters.editFilterAriaLabel', {
        defaultMessage: 'Edit {filter} filter',
        values: { filter: label },
      })}
      button={badge}
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <FilterOptionList
        id={id}
        options={options}
        value={value}
        customPlaceholder={customPlaceholderFor(id)}
        onChange={onChange}
      />
    </EuiPopover>
  );
};

export function OtelFilterBar() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const {
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser,
      os,
      location,
      pageUrl,
      frustration,
      user,
      includeBots,
      botUa,
      kuery,
      breakpoint,
      connection,
      device,
    },
  } = useLegacyUrlParams();

  const [facets, setFacets] = useState<RumFiltersResponse>(EMPTY);
  const [addOpen, setAddOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  useSyncOpenWithTourStep('filters', setFlyoutOpen);

  useEffect(() => {
    let cancelled = false;
    fetchRumFilters({
      http,
      rangeFrom,
      rangeTo,
      serviceName: typeof serviceName === 'string' ? serviceName : undefined,
      user,
      includeBots,
      botUa,
      kuery,
    })
      .then((result) => {
        if (!cancelled) {
          setFacets(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFacets(EMPTY);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [http, rangeFrom, rangeTo, serviceName, user, includeBots, botUa, kuery]);

  const setFilter = useCallback(
    (patch: RumFilterPatch) => {
      history.push({
        ...history.location,
        search: mergeRumSearch(history.location.search, patch),
      });
    },
    [history]
  );

  const setFilterValue = useCallback(
    (id: RumOtelFilterId, value?: string) => {
      const patch: RumFilterPatch = {};
      patch[id] = value ?? '';
      setFilter(patch);
    },
    [setFilter]
  );

  const locationFilter = typeof location === 'string' ? location : undefined;
  const values: Record<RumOtelFilterId, string | undefined> = {
    location: locationFilter,
    browser,
    os,
    pageUrl,
    breakpoint,
    connection,
    device,
    frustration,
    includeBots: includeBots === 'true' ? 'true' : undefined,
  };

  const optionSets = useMemo(() => {
    const raw: Record<RumFacetFilterId, string | undefined> = {
      location: locationFilter,
      browser,
      os,
      pageUrl,
      breakpoint,
      connection,
      device,
      frustration,
    };
    const labeled = (id: RumFacetFilterId, buckets: RumFilterOption[]) =>
      withSelectedOptions(labelFacetOptions(id, buckets), selectedFilterValues(raw[id]), (key) =>
        facetValueLabel(id, key)
      );

    return {
      location: labeled('location', bucketsToOptions(facets.countries)),
      browser: labeled('browser', bucketsToOptions(facets.browsers)),
      os: labeled('os', bucketsToOptions(facets.os)),
      pageUrl: labeled('pageUrl', bucketsToOptions(facets.pages)),
      breakpoint: labeled('breakpoint', bucketsToOptions(facets.breakpoints)),
      connection: labeled('connection', bucketsToOptions(facets.connections)),
      device: labeled('device', bucketsToOptions(facets.devices)),
      frustration: labeled('frustration', FRUSTRATION_OPTIONS),
      includeBots: [],
    } satisfies Record<RumOtelFilterId, RumFilterOption[]>;
  }, [breakpoint, browser, connection, device, facets, frustration, locationFilter, os, pageUrl]);

  const displayValue = (id: RumOtelFilterId, value: string): string | undefined => {
    if (id === 'includeBots') {
      return undefined;
    }
    const selected = selectedFilterValues(value);
    const first = firstSelectedLabel(optionSets[id], selected);
    if (!first) {
      return undefined;
    }
    const truncated = truncateValue(first);
    const labeled =
      parseFilterValues(value)[0]?.exclude === true ? excludedValueLabel(truncated) : truncated;
    return selected.length > 1 ? multiValueLabel(labeled, selected.length - 1) : labeled;
  };

  const isWideScreen = useIsWithinBreakpoints(['xl']);
  const pinnedIds: readonly RumOtelFilterId[] = isWideScreen
    ? [...PINNED_FILTER_IDS, ...EXPANDABLE_FILTER_IDS]
    : PINNED_FILTER_IDS;
  const overflowIds: readonly RumOtelFilterId[] = isWideScreen
    ? MENU_ONLY_FILTER_IDS
    : [...EXPANDABLE_FILTER_IDS, ...MENU_ONLY_FILTER_IDS];

  const appliedOverflow = overflowIds.filter((id) => Boolean(values[id]));
  const unusedOverflow = overflowIds.filter((id) => !values[id]);
  const customBotUa = Boolean(botUa);
  const anyActive = FILTER_IDS.some((id) => Boolean(values[id])) || customBotUa;
  const activeCount =
    FILTER_IDS.reduce((sum, id) => {
      if (id === 'includeBots') {
        return values[id] ? sum + 1 : sum;
      }
      return sum + selectedFilterValues(values[id]).length;
    }, 0) + (customBotUa ? 1 : 0);

  const moreFilterPanels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: i18n.translate('xpack.ux.filters.moreFiltersTitle', {
        defaultMessage: 'More filters',
      }),
      items: unusedOverflow.map((id) =>
        id === 'includeBots'
          ? {
              name: filterName(id),
              onClick: () => {
                setFilter({ includeBots: 'true' });
                setAddOpen(false);
              },
            }
          : {
              name: filterName(id),
              disabled: optionSets[id].length === 0,
              panel: FILTER_IDS.indexOf(id) + 1,
            }
      ),
    },
    ...unusedOverflow
      .filter((id) => id !== 'includeBots')
      .map((id) => ({
        id: FILTER_IDS.indexOf(id) + 1,
        title: filterName(id),
        content: (
          <FilterOptionList
            id={id}
            options={optionSets[id]}
            customPlaceholder={customPlaceholderFor(id)}
            onChange={(next) => setFilterValue(id, next)}
          />
        ),
      })),
  ];

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <EuiFilterButton
            iconType="filter"
            isSelected={flyoutOpen}
            onClick={() => setFlyoutOpen(true)}
            hasActiveFilters={anyActive}
            numActiveFilters={activeCount || undefined}
            grow={false}
            data-test-subj="uxOtelFiltersFlyoutOpen"
          >
            <UxTourAnchor stepId="filters">
              <span>
                {i18n.translate('xpack.ux.filters.allFiltersButtonLabel', {
                  defaultMessage: 'All filters',
                })}
              </span>
            </UxTourAnchor>
          </EuiFilterButton>
          {pinnedIds.map((id) => (
            <FacetSelect
              key={id}
              id={id}
              options={optionSets[id]}
              value={values[id]}
              onChange={(next) => setFilterValue(id, next)}
            />
          ))}
          {unusedOverflow.length > 0 && (
            <EuiPopover
              aria-label={i18n.translate('xpack.ux.filters.moreFiltersTitle', {
                defaultMessage: 'More filters',
              })}
              button={
                <EuiFilterButton
                  iconType="plusCircle"
                  isSelected={addOpen}
                  onClick={() => setAddOpen((current) => !current)}
                  grow={false}
                  data-test-subj="uxOtelFilterAdd"
                >
                  {i18n.translate('xpack.ux.filters.moreFiltersButtonLabel', {
                    defaultMessage: 'More filters',
                  })}
                </EuiFilterButton>
              }
              isOpen={addOpen}
              closePopover={() => setAddOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenu key={String(addOpen)} initialPanelId={0} panels={moreFilterPanels} />
            </EuiPopover>
          )}
        </EuiFilterGroup>
      </EuiFlexItem>
      {appliedOverflow.map((id) => {
        const value = values[id];
        if (!value) {
          return null;
        }
        return (
          <EuiFlexItem key={id} grow={false}>
            <FilterPill
              id={id}
              label={filterName(id)}
              displayValue={displayValue(id, value)}
              options={optionSets[id]}
              value={value}
              onChange={(next) => setFilterValue(id, next)}
              onRemove={() => setFilterValue(id, '')}
            />
          </EuiFlexItem>
        );
      })}
      {customBotUa && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            iconType="cross"
            iconSide="right"
            iconOnClick={() => setFilter({ botUa: '' })}
            iconOnClickAriaLabel={i18n.translate('xpack.ux.filters.removeBotKeywordsAriaLabel', {
              defaultMessage: 'Reset bot keywords',
            })}
            onClick={() => setFlyoutOpen(true)}
            onClickAriaLabel={i18n.translate('xpack.ux.filters.editBotKeywordsAriaLabel', {
              defaultMessage: 'Edit bot keywords',
            })}
            data-test-subj="uxOtelFilterPill-botUa"
          >
            {i18n.translate('xpack.ux.filters.botKeywordsLabel', {
              defaultMessage: 'Bot keywords',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {anyActive && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="left"
            onClick={() =>
              setFilter({
                browser: '',
                os: '',
                location: '',
                pageUrl: '',
                frustration: '',
                includeBots: '',
                botUa: '',
                breakpoint: '',
                connection: '',
                device: '',
              })
            }
            data-test-subj="uxOtelFiltersClear"
          >
            {i18n.translate('xpack.ux.filters.clear', { defaultMessage: 'Clear filters' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {flyoutOpen && (
        <FiltersFlyout
          optionSets={optionSets}
          values={values}
          botUa={botUa}
          onApply={setFilter}
          onClose={() => setFlyoutOpen(false)}
        />
      )}
    </EuiFlexGroup>
  );
}

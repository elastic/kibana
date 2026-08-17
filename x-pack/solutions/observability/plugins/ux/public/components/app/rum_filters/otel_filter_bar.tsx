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
  EuiSelectable,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor, EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { RumFacetBucket, RumFiltersResponse } from '../../../../common/rum_app';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumFilters } from '../../../services/rest/rum_api';
import { mergeRumSearch, type RumFilterPatch } from '../../../utils/rum_search';

const EMPTY: RumFiltersResponse = {
  browsers: [],
  os: [],
  pages: [],
  breakpoints: [],
  connections: [],
  devices: [],
  countries: [],
};

const PINNED_FILTER_IDS = ['location', 'browser', 'os', 'pageUrl'] as const;
// Pinned alongside the defaults on wide screens; collapsed into "More filters" otherwise.
const EXPANDABLE_FILTER_IDS = ['breakpoint', 'connection', 'device', 'frustration'] as const;
const MENU_ONLY_FILTER_IDS = ['includeBots'] as const;
const FILTER_IDS = [
  ...PINNED_FILTER_IDS,
  ...EXPANDABLE_FILTER_IDS,
  ...MENU_ONLY_FILTER_IDS,
] as const;

type RumOtelFilterId = (typeof FILTER_IDS)[number];

const countryLabel = (isoCode: string): string => {
  try {
    return (
      new Intl.DisplayNames(undefined, { type: 'region' }).of(isoCode.toUpperCase()) ?? isoCode
    );
  } catch {
    return isoCode;
  }
};

const truncateValue = (value: string, max = 48): string => {
  if (value.length <= max) {
    return value;
  }
  return `\u2026${value.slice(-(max - 1))}`;
};

const FRUSTRATION_OPTIONS: Array<{ key: string; label: string }> = [
  {
    key: 'rage',
    label: i18n.translate('xpack.ux.filters.frustration.rage', { defaultMessage: 'Rage clicks' }),
  },
  {
    key: 'error',
    label: i18n.translate('xpack.ux.filters.frustration.errors', { defaultMessage: 'Errors' }),
  },
  {
    key: 'dead',
    label: i18n.translate('xpack.ux.filters.frustration.dead', { defaultMessage: 'Dead clicks' }),
  },
];

const filterName = (id: RumOtelFilterId): string => {
  switch (id) {
    case 'location':
      return i18n.translate('xpack.ux.filters.location', { defaultMessage: 'Location' });
    case 'browser':
      return i18n.translate('xpack.ux.filters.browser', { defaultMessage: 'Browser' });
    case 'os':
      return i18n.translate('xpack.ux.filters.os', { defaultMessage: 'OS' });
    case 'pageUrl':
      return i18n.translate('xpack.ux.filters.page', { defaultMessage: 'Page' });
    case 'breakpoint':
      return i18n.translate('xpack.ux.filters.breakpoint', { defaultMessage: 'Breakpoint' });
    case 'connection':
      return i18n.translate('xpack.ux.filters.connection', { defaultMessage: 'Connection' });
    case 'device':
      return i18n.translate('xpack.ux.filters.device', { defaultMessage: 'Device memory' });
    case 'frustration':
      return i18n.translate('xpack.ux.filters.frustration', { defaultMessage: 'Frustration' });
    case 'includeBots':
      return i18n.translate('xpack.ux.filters.includeBots', { defaultMessage: 'Include bots' });
  }
};

const bucketsToOptions = (buckets: RumFacetBucket[]) =>
  buckets.map((bucket) => ({ key: bucket.key, count: bucket.count }));

const withSelectedOption = (
  options: Array<{ key: string; label?: string; count?: number }>,
  value?: string,
  labelFor?: (key: string) => string
) => {
  if (!value || options.some((option) => option.key === value)) {
    return options;
  }
  return [{ key: value, label: labelFor?.(value) ?? value, count: 0 }, ...options];
};

const FilterOptionList = ({
  options,
  value,
  onPick,
  customPlaceholder,
}: {
  options: Array<{ key: string; label?: string; count?: number }>;
  value?: string;
  onPick: (next?: string) => void;
  customPlaceholder?: string;
}) => {
  const [custom, setCustom] = useState(
    value && !options.some((option) => option.key === value) ? value : ''
  );
  const items: EuiSelectableOption[] = options.map((option) => ({
    label: `${option.label ?? option.key}${option.count != null ? ` (${option.count})` : ''}`,
    key: option.key,
    checked: value === option.key ? 'on' : undefined,
  }));

  return (
    <EuiSelectable
      singleSelection
      searchable={options.length > 8}
      options={items}
      onChange={(next) => {
        const selectedOption = next.find((option) => option.checked === 'on');
        onPick(selectedOption?.key);
      }}
      listProps={{ onFocusBadge: false }}
    >
      {(list, search) => (
        <div style={{ width: 280 }}>
          {customPlaceholder && (
            <div style={{ padding: 8 }}>
              <EuiFieldSearch
                compressed
                placeholder={customPlaceholder}
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                onSearch={(next) => {
                  const trimmed = next.trim();
                  onPick(trimmed || undefined);
                }}
                isClearable
                data-test-subj="uxOtelFilter-customPath"
              />
            </div>
          )}
          {search}
          {list}
        </div>
      )}
    </EuiSelectable>
  );
};

const pagePathPlaceholder = i18n.translate('xpack.ux.filters.page.customPlaceholder', {
  defaultMessage: 'Type a path, e.g. /checkout',
});

const customPlaceholderFor = (id: RumOtelFilterId): string | undefined =>
  id === 'pageUrl' ? pagePathPlaceholder : undefined;

const FacetSelect = ({
  id,
  options,
  value,
  onChange,
}: {
  id: RumOtelFilterId;
  options: Array<{ key: string; label?: string; count?: number }>;
  value?: string;
  onChange: (next?: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const label = filterName(id);
  const selected = options.find((option) => option.key === value);
  const buttonLabel = truncateValue(selected?.label ?? selected?.key ?? value ?? label, 28);

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
          hasActiveFilters={Boolean(value)}
          numActiveFilters={value ? 1 : undefined}
          isDisabled={options.length === 0 && !value && id !== 'pageUrl'}
          grow={false}
          data-test-subj={`uxOtelFilter-${id}`}
        >
          {buttonLabel}
        </EuiFilterButton>
      }
    >
      <FilterOptionList
        options={options}
        value={value}
        customPlaceholder={customPlaceholderFor(id)}
        onPick={(next) => {
          onChange(next);
          setOpen(false);
        }}
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
  options: Array<{ key: string; label?: string; count?: number }>;
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
        options={options}
        value={value}
        customPlaceholder={customPlaceholderFor(id)}
        onPick={(next) => {
          onChange(next);
          setOpen(false);
        }}
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
      kuery,
      breakpoint,
      connection,
      device,
    },
  } = useLegacyUrlParams();

  const [facets, setFacets] = useState<RumFiltersResponse>(EMPTY);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRumFilters({
      http,
      rangeFrom,
      rangeTo,
      serviceName: typeof serviceName === 'string' ? serviceName : undefined,
      user,
      includeBots,
      kuery,
      breakpoint,
      connection,
      device,
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
  }, [
    http,
    rangeFrom,
    rangeTo,
    serviceName,
    user,
    includeBots,
    kuery,
    breakpoint,
    connection,
    device,
  ]);

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
    const countryOptions = withSelectedOption(
      bucketsToOptions(facets.countries).map((option) => ({
        ...option,
        label: countryLabel(option.key),
      })),
      locationFilter,
      countryLabel
    );
    const deviceOptions = withSelectedOption(
      bucketsToOptions(facets.devices).map((option) => ({
        ...option,
        label: option.key ? `${option.key} GB` : option.key,
      })),
      device,
      (key) => `${key} GB`
    );

    return {
      location: countryOptions,
      browser: withSelectedOption(bucketsToOptions(facets.browsers), browser),
      os: withSelectedOption(bucketsToOptions(facets.os), os),
      pageUrl: withSelectedOption(bucketsToOptions(facets.pages), pageUrl),
      breakpoint: withSelectedOption(bucketsToOptions(facets.breakpoints), breakpoint),
      connection: withSelectedOption(bucketsToOptions(facets.connections), connection),
      device: deviceOptions,
      frustration: FRUSTRATION_OPTIONS,
      includeBots: [],
    } satisfies Record<RumOtelFilterId, Array<{ key: string; label?: string; count?: number }>>;
  }, [breakpoint, browser, connection, device, facets, locationFilter, os, pageUrl]);

  const displayValue = (id: RumOtelFilterId, value: string): string | undefined => {
    if (id === 'includeBots') {
      return undefined;
    }
    const match = optionSets[id].find((option) => option.key === value);
    return truncateValue(match?.label ?? match?.key ?? value);
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
  const anyActive = FILTER_IDS.some((id) => Boolean(values[id]));

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
            options={optionSets[id]}
            customPlaceholder={customPlaceholderFor(id)}
            onPick={(next) => {
              setFilterValue(id, next);
              setAddOpen(false);
            }}
          />
        ),
      })),
  ];

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
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
    </EuiFlexGroup>
  );
}

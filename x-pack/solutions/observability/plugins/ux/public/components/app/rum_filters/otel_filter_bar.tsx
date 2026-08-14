/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { RumFacetBucket, RumFiltersResponse } from '../../../../common/rum_app';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumFilters } from '../../../services/rest/rum_api';
import { mergeRumSearch } from '../../../utils/rum_search';

const EMPTY: RumFiltersResponse = {
  browsers: [],
  os: [],
  pages: [],
  breakpoints: [],
  connections: [],
  devices: [],
  countries: [],
};

const countryLabel = (isoCode: string): string => {
  try {
    return (
      new Intl.DisplayNames(undefined, { type: 'region' }).of(isoCode.toUpperCase()) ?? isoCode
    );
  } catch {
    return isoCode;
  }
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

const FacetSelect = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: string; label?: string; count?: number }>;
  value?: string;
  onChange: (next?: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const items: EuiSelectableOption[] = options.map((option) => ({
    label: `${option.label ?? option.key}${option.count != null ? ` (${option.count})` : ''}`,
    key: option.key,
    checked: value === option.key ? 'on' : undefined,
  }));
  const selected = options.find((option) => option.key === value);

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
          iconType="arrowDown"
          isSelected={open}
          onClick={() => setOpen((v) => !v)}
          hasActiveFilters={Boolean(value)}
          numActiveFilters={value ? 1 : undefined}
          isDisabled={options.length === 0 && !value}
          grow={false}
        >
          {selected?.label ?? selected?.key ?? label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        singleSelection
        options={items}
        onChange={(next) => {
          const selectedOption = next.find((option) => option.checked === 'on');
          onChange(selectedOption?.key);
          setOpen(false);
        }}
      >
        {(list) => <div style={{ width: 260 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

const bucketsToOptions = (buckets: RumFacetBucket[]) =>
  buckets.map((bucket) => ({ key: bucket.key, count: bucket.count }));

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
    (patch: {
      browser?: string;
      os?: string;
      location?: string;
      pageUrl?: string;
      frustration?: string;
      includeBots?: string;
      breakpoint?: string;
      connection?: string;
      device?: string;
    }) => {
      history.push({
        ...history.location,
        search: mergeRumSearch(history.location.search, patch),
      });
    },
    [history]
  );

  const locationFilter = typeof location === 'string' ? location : undefined;

  const anyActive = Boolean(
    browser ||
      os ||
      locationFilter ||
      pageUrl ||
      frustration ||
      includeBots === 'true' ||
      breakpoint ||
      connection ||
      device
  );

  const countryOptions = bucketsToOptions(facets.countries).map((option) => ({
    ...option,
    label: countryLabel(option.key),
  }));
  if (locationFilter && !countryOptions.some((option) => option.key === locationFilter)) {
    countryOptions.unshift({
      key: locationFilter,
      label: countryLabel(locationFilter),
      count: 0,
    });
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <FacetSelect
            label={i18n.translate('xpack.ux.filters.location', { defaultMessage: 'Location' })}
            options={countryOptions}
            value={locationFilter}
            onChange={(next) => setFilter({ location: next ?? '' })}
          />
          <FacetSelect
            label={i18n.translate('xpack.ux.filters.browser', { defaultMessage: 'Browser' })}
            options={bucketsToOptions(facets.browsers)}
            value={browser}
            onChange={(next) => setFilter({ browser: next ?? '' })}
          />
          <FacetSelect
            label={i18n.translate('xpack.ux.filters.os', { defaultMessage: 'OS' })}
            options={bucketsToOptions(facets.os)}
            value={os}
            onChange={(next) => setFilter({ os: next ?? '' })}
          />
          <FacetSelect
            label={i18n.translate('xpack.ux.filters.page', { defaultMessage: 'Page' })}
            options={bucketsToOptions(facets.pages)}
            value={pageUrl}
            onChange={(next) => setFilter({ pageUrl: next ?? '' })}
          />
          <FacetSelect
            label={i18n.translate('xpack.ux.filters.breakpoint', { defaultMessage: 'Breakpoint' })}
            options={bucketsToOptions(facets.breakpoints)}
            value={breakpoint}
            onChange={(next) => setFilter({ breakpoint: next ?? '' })}
          />
          <FacetSelect
            label={i18n.translate('xpack.ux.filters.connection', { defaultMessage: 'Connection' })}
            options={bucketsToOptions(facets.connections)}
            value={connection}
            onChange={(next) => setFilter({ connection: next ?? '' })}
          />
          <FacetSelect
            label={i18n.translate('xpack.ux.filters.device', { defaultMessage: 'Device memory' })}
            options={bucketsToOptions(facets.devices).map((option) => ({
              ...option,
              label: option.key ? `${option.key} GB` : option.key,
            }))}
            value={device}
            onChange={(next) => setFilter({ device: next ?? '' })}
          />
          <FacetSelect
            label={i18n.translate('xpack.ux.filters.frustration', {
              defaultMessage: 'Frustration',
            })}
            options={FRUSTRATION_OPTIONS}
            value={frustration}
            onChange={(next) => setFilter({ frustration: next ?? '' })}
          />
          <EuiFilterButton
            hasActiveFilters={includeBots === 'true'}
            onClick={() => setFilter({ includeBots: includeBots === 'true' ? '' : 'true' })}
            data-test-subj="uxOtelFilterIncludeBots"
          >
            {i18n.translate('xpack.ux.filters.includeBots', { defaultMessage: 'Include bots' })}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
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
      {(pageUrl || frustration) && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{pageUrl || frustration}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

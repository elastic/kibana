/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { RumCountryRow } from '../../../../common/rum_app';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { VITAL_P75_HELP } from '../../../utils/vital_help';
import { VitalColumnName } from '../../../utils/vital_help_label';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';
import { VisitorCountryMap } from './visitor_country_map';

const LCP_POOR_MS = 4000;
const LCP_NI_MS = 2500;
const COUNTRY_PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_COUNTRY_PAGE_SIZE = 10;

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const lcpTone = (ms: number | null): 'success' | 'warning' | 'danger' | undefined => {
  if (ms == null) {
    return undefined;
  }
  if (ms >= LCP_POOR_MS) {
    return 'danger';
  }
  if (ms >= LCP_NI_MS) {
    return 'warning';
  }
  return 'success';
};

export interface VisitorCountriesPanelProps {
  countries: RumCountryRow[];
  activeLocation?: string;
  maxPageViews: number;
  hideHeader?: boolean;
  headerExtra?: React.ReactNode;
  flush?: boolean;
}

/** Ranked country breakdown with filter + session deep-links (OTel client.geo.*). */
export function VisitorCountriesPanel({
  countries,
  activeLocation,
  maxPageViews,
  hideHeader = false,
  headerExtra,
  flush = false,
}: VisitorCountriesPanelProps) {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_COUNTRY_PAGE_SIZE);

  const pageCount = Math.max(1, Math.ceil(countries.length / pageSize));
  const currentPageIndex = Math.min(pageIndex, pageCount - 1);
  const pageOfItems = useMemo(
    () => countries.slice(currentPageIndex * pageSize, currentPageIndex * pageSize + pageSize),
    [countries, currentPageIndex, pageSize]
  );

  const onTableChange = ({ page }: Criteria<RumCountryRow>) => {
    if (!page) {
      return;
    }
    setPageIndex(page.index);
    setPageSize(page.size);
  };

  const activeRow = activeLocation
    ? countries.find((row) => row.isoCode === activeLocation)
    : undefined;

  const columns: Array<EuiBasicTableColumn<RumCountryRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.ux.overview.countries.country', { defaultMessage: 'Country' }),
      render: (_name: string, row) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj={`uxOverviewCountry-${row.isoCode}`}
              onClick={() => pushRumPath(history, '/', { location: row.isoCode })}
            >
              <strong>{row.name}</strong>
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{row.isoCode}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'pageViews',
      name: i18n.translate('xpack.ux.overview.countries.views', { defaultMessage: 'Views' }),
      width: '28%',
      render: (views: number) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiProgress value={views} max={Math.max(1, maxPageViews)} size="s" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{views}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'sessions',
      name: i18n.translate('xpack.ux.overview.countries.sessions', { defaultMessage: 'Sessions' }),
      width: '90px',
    },
    {
      field: 'p75Lcp',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.overview.countries.lcp', { defaultMessage: 'LCP p75' })}
          tooltip={VITAL_P75_HELP.lcp}
        />
      ),
      width: '110px',
      render: (value: number | null) => {
        const tone = lcpTone(value);
        return tone ? (
          <EuiBadge color={tone}>{formatMs(value)}</EuiBadge>
        ) : (
          <EuiText size="s">{formatMs(value)}</EuiText>
        );
      },
    },
    {
      field: 'errorCount',
      name: i18n.translate('xpack.ux.overview.countries.errors', { defaultMessage: 'Errors' }),
      width: '80px',
      render: (count: number) =>
        count > 0 ? <EuiBadge color="danger">{count}</EuiBadge> : <EuiText size="s">0</EuiText>,
    },
    {
      name: i18n.translate('xpack.ux.overview.countries.actions', { defaultMessage: 'Actions' }),
      width: '160px',
      actions: [
        {
          name: i18n.translate('xpack.ux.overview.countries.viewSessions', {
            defaultMessage: 'View sessions',
          }),
          description: i18n.translate('xpack.ux.overview.countries.viewSessionsDesc', {
            defaultMessage: 'Open Sessions filtered to this country',
          }),
          type: 'icon',
          icon: 'play',
          'data-test-subj': 'uxOverviewCountrySessions',
          onClick: (row: RumCountryRow) => {
            pushRumPath(history, '/session-replay', sessionsPatch({ location: row.isoCode }));
          },
        },
        {
          name: i18n.translate('xpack.ux.overview.countries.filter', {
            defaultMessage: 'Filter overview',
          }),
          description: i18n.translate('xpack.ux.overview.countries.filterDesc', {
            defaultMessage: 'Scope Overview metrics to this country',
          }),
          type: 'icon',
          icon: 'filter',
          'data-test-subj': 'uxOverviewCountryFilter',
          onClick: (row: RumCountryRow) => {
            pushRumPath(history, '/', { location: row.isoCode });
          },
        },
      ],
    },
  ];

  return (
    <EuiPanel
      hasBorder={!flush}
      paddingSize={flush ? 'none' : 'm'}
      data-test-subj="uxOverviewVisitorCountries"
    >
      {!hideHeader && (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <UxTourAnchor stepId="countryMap">
              <div>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.ux.overview.countriesTitle', {
                      defaultMessage: 'Visitors by country',
                    })}
                  </h3>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.ux.overview.countriesSubtitle', {
                    defaultMessage:
                      'Volume, LCP, and errors by client.geo. Filter Overview or open Sessions for a country.',
                  })}
                </EuiText>
              </div>
            </UxTourAnchor>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {headerExtra ? <EuiFlexItem grow={false}>{headerExtra}</EuiFlexItem> : null}
              {activeLocation ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="uxOverviewCountryClear"
                    size="xs"
                    iconType="cross"
                    onClick={() => pushRumPath(history, '/', { location: '' })}
                  >
                    {i18n.translate('xpack.ux.overview.countries.clear', {
                      defaultMessage: 'Clear country filter',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {activeLocation && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="primary"
            title={i18n.translate('xpack.ux.overview.countries.activeFilter', {
              defaultMessage: 'Filtered to {name} ({iso})',
              values: {
                name: activeRow?.name ?? activeLocation,
                iso: activeLocation,
              },
            })}
          >
            <EuiLink
              data-test-subj="uxOverviewCountryActiveSessions"
              onClick={() =>
                pushRumPath(history, '/session-replay', sessionsPatch({ location: activeLocation }))
              }
            >
              {i18n.translate('xpack.ux.overview.countries.openFilteredSessions', {
                defaultMessage: 'View sessions in this country',
              })}
            </EuiLink>
          </EuiCallOut>
        </>
      )}

      <EuiSpacer size="s" />

      {countries.length === 0 ? (
        <EuiText size="s" color="subdued" style={{ color: euiTheme.colors.subduedText }}>
          {i18n.translate('xpack.ux.overview.countries.empty', {
            defaultMessage:
              'No client.geo.country_iso_code on documents in this range. Stamp geo on ingest or generators.',
          })}
        </EuiText>
      ) : (
        <EuiFlexGroup gutterSize="m" alignItems="flexStart">
          <EuiFlexItem grow={4} style={{ minWidth: 280 }}>
            <VisitorCountryMap
              countries={countries}
              activeLocation={activeLocation}
              onFilter={(isoCode) => pushRumPath(history, '/', { location: isoCode })}
              onSessions={(isoCode) =>
                pushRumPath(history, '/session-replay', sessionsPatch({ location: isoCode }))
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={6} style={{ minWidth: 320 }}>
            <EuiBasicTable
              data-test-subj="uxOverviewCountriesTable"
              tableCaption={i18n.translate('xpack.ux.overview.countriesCaption', {
                defaultMessage: 'Visitors by country',
              })}
              items={pageOfItems}
              columns={columns}
              pagination={{
                pageIndex: currentPageIndex,
                pageSize,
                totalItemCount: countries.length,
                pageSizeOptions: COUNTRY_PAGE_SIZE_OPTIONS,
              }}
              onChange={onTableChange}
              rowProps={(row) => ({
                className: row.isoCode === activeLocation ? 'euiTableRow-isSelected' : undefined,
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}

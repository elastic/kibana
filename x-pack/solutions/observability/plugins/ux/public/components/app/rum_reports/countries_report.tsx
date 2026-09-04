/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { RumCountryRow } from '../../../../common/rum_app';
import type { RumReportCountryRow, RumReportDelta } from '../../../../common/rum_report';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { VITAL_P75_HELP } from '../../../utils/vital_help';
import { VitalColumnName } from '../../../utils/vital_help_label';
import { VisitorCountryMap } from '../rum_overview/visitor_country_map';
import { formatReportMs, formatReportRate } from './format';

const hasDeltas = (row: RumCountryRow | RumReportCountryRow): row is RumReportCountryRow =>
  'pageViewsDelta' in row;

const formatDelta = (delta: RumReportDelta): string | null => {
  if (delta.pct == null || !Number.isFinite(delta.pct) || delta.abs === 0) {
    return null;
  }
  const label = formatReportRate(delta.pct);
  return (delta.abs ?? 0) > 0 ? `+${label}` : label;
};

export function CountriesReportPanel({
  countries,
}: {
  countries: Array<RumCountryRow | RumReportCountryRow>;
}) {
  const history = useHistory();

  const columns: Array<EuiBasicTableColumn<RumCountryRow | RumReportCountryRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.ux.reports.countries.countryLabel', {
        defaultMessage: 'Country',
      }),
      render: (_name: string, row) => (
        <EuiLink
          data-test-subj={`uxReportCountry-${row.isoCode}`}
          onClick={() =>
            pushRumPath(history, '/session-replay', sessionsPatch({ location: row.isoCode }))
          }
        >
          {row.name} ({row.isoCode})
        </EuiLink>
      ),
    },
    {
      field: 'pageViews',
      name: i18n.translate('xpack.ux.reports.countries.viewsLabel', { defaultMessage: 'Views' }),
      width: '110px',
      render: (views: number, row) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{views}</EuiFlexItem>
          {hasDeltas(row) && formatDelta(row.pageViewsDelta) && (
            <EuiFlexItem grow={false}>
              <EuiBadge className="uxRumRankChip" color="hollow">
                {formatDelta(row.pageViewsDelta)}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'sessions',
      name: i18n.translate('xpack.ux.reports.countries.sessionsLabel', {
        defaultMessage: 'Sessions',
      }),
      width: '90px',
    },
    {
      field: 'p75Lcp',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.reports.countries.lcpLabel', {
            defaultMessage: 'LCP p75',
          })}
          tooltip={VITAL_P75_HELP.lcp}
        />
      ),
      width: '90px',
      render: (value: number | null) => formatReportMs(value),
    },
    {
      field: 'errorCount',
      name: i18n.translate('xpack.ux.reports.countries.errorsLabel', { defaultMessage: 'Errors' }),
      width: '80px',
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="uxReportCountries">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ux.reports.countriesTitle', {
            defaultMessage: 'Visitors by country',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.ux.reports.countriesDescription', {
          defaultMessage: 'Volume and errors by client.geo.country_iso_code.',
        })}
      </EuiText>
      <EuiSpacer size="s" />
      {countries.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.ux.reports.countries.emptyMessage', {
            defaultMessage: 'No country geo on documents in this range.',
          })}
        </EuiText>
      ) : (
        <EuiFlexGroup gutterSize="m" alignItems="flexStart">
          <EuiFlexItem grow={4} style={{ minWidth: 240 }}>
            <VisitorCountryMap
              countries={countries}
              height={280}
              printFallback
              onSessions={(isoCode) =>
                pushRumPath(history, '/session-replay', sessionsPatch({ location: isoCode }))
              }
              onFilter={(isoCode) => pushRumPath(history, '/', { location: isoCode })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={6} style={{ minWidth: 280 }}>
            <EuiBasicTable
              tableCaption={i18n.translate('xpack.ux.reports.countriesCaption', {
                defaultMessage: 'Visitors by country',
              })}
              items={countries}
              columns={columns}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}

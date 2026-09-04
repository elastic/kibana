/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopoverTitle,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { INITIAL_LOCATION } from '@kbn/maps-plugin/common';
import type { RenderTooltipContentParams } from '@kbn/maps-plugin/public';
import type { RumCountryRow } from '../../../../common/rum_app';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { VITAL_P75_HELP } from '../../../utils/vital_help';
import { countryCentroid } from './country_centroids';
import {
  countryChoroplethLayer,
  isoFromMapProperties,
  type CountryMapMetric,
} from './country_map_layer';

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const metricValue = (row: RumCountryRow, metric: CountryMapMetric): number => row[metric];

const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;

const project = (lng: number, lat: number): { x: number; y: number } => ({
  x: ((lng + 180) / 360) * MAP_WIDTH,
  y: ((90 - lat) / 180) * MAP_HEIGHT,
});

export interface VisitorCountryMapProps {
  countries: RumCountryRow[];
  activeLocation?: string;
  height?: number;
  printFallback?: boolean;
  onFilter?: (isoCode: string) => void;
  onSessions?: (isoCode: string) => void;
}

/** Choropleth of the Overview country rollup; SVG bubbles when Maps is unavailable or for print. */
export function VisitorCountryMap({
  countries,
  activeLocation,
  height = 360,
  printFallback = false,
  onFilter,
  onSessions,
}: VisitorCountryMapProps) {
  const { maps } = useKibanaServices();
  const [metric, setMetric] = useState<CountryMapMetric>('pageViews');
  const layerList = useMemo(() => [countryChoroplethLayer(countries, metric)], [countries, metric]);

  const metricOptions = [
    {
      id: 'pageViews',
      label: i18n.translate('xpack.ux.overview.countries.viewsMetricButtonLabel', {
        defaultMessage: 'Views',
      }),
    },
    {
      id: 'sessions',
      label: i18n.translate('xpack.ux.overview.countries.sessionsMetricButtonLabel', {
        defaultMessage: 'Sessions',
      }),
    },
    {
      id: 'errorCount',
      label: i18n.translate('xpack.ux.overview.countries.errorsMetricButtonLabel', {
        defaultMessage: 'Errors',
      }),
    },
  ];

  const renderTooltip = ({ closeTooltip, features }: RenderTooltipContentParams): JSX.Element => {
    const iso = isoFromMapProperties(features[0]?.mbProperties ?? undefined);
    const row = iso
      ? countries.find((country) => country.isoCode.toUpperCase() === iso)
      : undefined;
    if (!row) {
      return <div />;
    }
    return (
      <CountryMapTooltip
        row={row}
        onFilter={onFilter}
        onSessions={onSessions}
        onClose={closeTooltip}
      />
    );
  };

  const mapNode =
    maps?.Map &&
    maps.Map({
      title: '',
      layerList,
      isLayerTOCOpen: false,
      hideFilterActions: true,
      mapSettings: {
        disableInteractive: false,
        hideToolbarOverlay: false,
        hideLayerControl: true,
        hideViewControl: false,
        initialLocation: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS,
        autoFitToDataBounds: true,
      },
      getTooltipRenderer: () => renderTooltip,
    });

  return (
    <div
      data-test-subj="uxOverviewVisitorCountryMap"
      css={css`
        .uxRumCountryMapPrint {
          display: none;
        }
      `}
    >
      <EuiButtonGroup
        legend={i18n.translate('xpack.ux.overview.countries.mapMetricAriaLabel', {
          defaultMessage: 'Map metric',
        })}
        type="single"
        options={metricOptions}
        idSelected={metric}
        onChange={(id) => setMetric(id as CountryMapMetric)}
        buttonSize="compressed"
        isFullWidth
      />
      <EuiSpacer size="s" />
      {mapNode ? (
        <>
          <div
            className={printFallback ? 'uxRumCountryMapCanvas uxRumReportNoPrint' : undefined}
            css={css`
              height: ${height}px;
              min-height: ${height}px;
              .mapEmbeddableContainer,
              .embPanel__content {
                height: 100%;
              }
            `}
          >
            {mapNode}
          </div>
          {printFallback && (
            <div className="uxRumCountryMapPrint">
              <CountryBubbleMap
                countries={countries}
                metric={metric}
                activeLocation={activeLocation}
                onCountryClick={onFilter}
              />
            </div>
          )}
        </>
      ) : (
        <CountryBubbleMap
          countries={countries}
          metric={metric}
          activeLocation={activeLocation}
          onCountryClick={onFilter}
        />
      )}
    </div>
  );
}

function CountryMapTooltip({
  row,
  onFilter,
  onSessions,
  onClose,
}: {
  row: RumCountryRow;
  onFilter?: (isoCode: string) => void;
  onSessions?: (isoCode: string) => void;
  onClose: () => void;
}) {
  return (
    <div style={{ minWidth: 220 }}>
      <EuiPopoverTitle>
        {row.name} ({row.isoCode})
      </EuiPopoverTitle>
      <EuiDescriptionList type="column" compressed textStyle="reverse">
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.ux.overview.countries.tooltipViewsLabel', {
            defaultMessage: 'Views',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{row.pageViews}</EuiDescriptionListDescription>
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.ux.overview.countries.tooltipSessionsLabel', {
            defaultMessage: 'Sessions',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{row.sessions}</EuiDescriptionListDescription>
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.ux.overview.countries.tooltipLcpLabel', {
            defaultMessage: 'LCP p75',
          })}
          <EuiIconTip content={VITAL_P75_HELP.lcp} type="info" />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{formatMs(row.p75Lcp)}</EuiDescriptionListDescription>
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.ux.overview.countries.tooltipErrorsLabel', {
            defaultMessage: 'Errors',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{row.errorCount}</EuiDescriptionListDescription>
      </EuiDescriptionList>
      {(onFilter || onSessions) && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {onFilter && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="uxCountryMapFilter"
                  size="xs"
                  iconType="filter"
                  onClick={() => {
                    onFilter(row.isoCode);
                    onClose();
                  }}
                >
                  {i18n.translate('xpack.ux.overview.countries.mapFilterLinkText', {
                    defaultMessage: 'Filter',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {onSessions && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="uxCountryMapSessions"
                  size="xs"
                  iconType="play"
                  onClick={() => {
                    onSessions(row.isoCode);
                    onClose();
                  }}
                >
                  {i18n.translate('xpack.ux.overview.countries.mapSessionsLinkText', {
                    defaultMessage: 'Sessions',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
}

function CountryBubbleMap({
  countries,
  metric,
  activeLocation,
  onCountryClick,
}: {
  countries: RumCountryRow[];
  metric: CountryMapMetric;
  activeLocation?: string;
  onCountryClick?: (isoCode: string) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(1, ...countries.map((row) => metricValue(row, metric)));
  const fill = metric === 'errorCount' ? euiTheme.colors.danger : euiTheme.colors.vis.euiColorVis0;

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label={i18n.translate('xpack.ux.overview.countries.bubbleMapAriaLabel', {
        defaultMessage: 'Visitors by country',
      })}
      css={css`
        width: 100%;
        height: auto;
        display: block;
        background: ${euiTheme.colors.body};
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      {[-120, -60, 0, 60, 120].map((lng) => {
        const { x } = project(lng, 0);
        return (
          <line
            key={`lng-${lng}`}
            x1={x}
            y1={0}
            x2={x}
            y2={MAP_HEIGHT}
            stroke={euiTheme.colors.lightShade}
            strokeWidth={1}
          />
        );
      })}
      {[-60, -30, 0, 30, 60].map((lat) => {
        const { y } = project(0, lat);
        return (
          <line
            key={`lat-${lat}`}
            x1={0}
            y1={y}
            x2={MAP_WIDTH}
            y2={y}
            stroke={euiTheme.colors.lightShade}
            strokeWidth={1}
          />
        );
      })}
      {countries.map((row) => {
        const centroid = countryCentroid(row.isoCode);
        if (!centroid) {
          return null;
        }
        const { x, y } = project(centroid[0], centroid[1]);
        const value = metricValue(row, metric);
        const r = 4 + Math.sqrt(value / max) * 22;
        const isActive = row.isoCode === activeLocation;
        return (
          <g key={row.isoCode}>
            <title>{`${row.name} (${row.isoCode}): ${value}`}</title>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={fill}
              fillOpacity={isActive ? 0.95 : 0.55}
              stroke={isActive ? euiTheme.colors.primary : euiTheme.colors.emptyShade}
              strokeWidth={isActive ? 2 : 1}
              style={{ cursor: onCountryClick ? 'pointer' : 'default' }}
              onClick={onCountryClick ? () => onCountryClick(row.isoCode) : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}

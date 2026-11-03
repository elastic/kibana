/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import {
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '@kbn/maps-plugin/common';
import type { RumCountryRow } from '../../../../common/rum_app';

export type CountryMapMetric = 'pageViews' | 'sessions' | 'errorCount';

export const COUNTRY_MAP_LAYER_ID = 'ux-rum-country-choropleth';
export const COUNTRY_MAP_JOIN_ID = 'ux-rum-country-table';

const PALETTE: Record<CountryMapMetric, string> = {
  pageViews: 'Blues',
  sessions: 'Greens',
  errorCount: 'Yellow to Red',
};

/** EMS world_countries choropleth joined to the Overview country rollup (not APM duration). */
export const countryChoroplethLayer = (
  countries: RumCountryRow[],
  metric: CountryMapMetric
): LayerDescriptor =>
  ({
    id: COUNTRY_MAP_LAYER_ID,
    label: i18n.translate('xpack.ux.overview.countries.mapLayerLabel', {
      defaultMessage: 'Visitors by country',
    }),
    minZoom: 0,
    maxZoom: 24,
    alpha: 0.85,
    visible: true,
    type: LAYER_TYPE.GEOJSON_VECTOR,
    joins: [
      {
        leftField: 'iso2',
        right: {
          id: COUNTRY_MAP_JOIN_ID,
          type: SOURCE_TYPES.TABLE_SOURCE,
          term: 'isoCode',
          __rows: countries.map((row) => ({
            isoCode: row.isoCode.toUpperCase(),
            name: row.name,
            pageViews: row.pageViews,
            sessions: row.sessions,
            errorCount: row.errorCount,
          })),
          __columns: [
            { name: 'isoCode', label: 'ISO', type: 'string' },
            { name: 'name', label: 'Country', type: 'string' },
            { name: 'pageViews', label: 'Views', type: 'number' },
            { name: 'sessions', label: 'Sessions', type: 'number' },
            { name: 'errorCount', label: 'Errors', type: 'number' },
          ],
        },
      },
    ],
    sourceDescriptor: {
      type: SOURCE_TYPES.EMS_FILE,
      id: 'world_countries',
      tooltipProperties: ['name', 'iso2'],
    },
    style: {
      type: 'VECTOR',
      isTimeAware: false,
      properties: {
        [VECTOR_STYLES.FILL_COLOR]: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            color: PALETTE[metric],
            colorCategory: 'palette_0',
            fieldMetaOptions: { isEnabled: true, sigma: 3 },
            type: COLOR_MAP_TYPE.ORDINAL,
            field: {
              name: metric,
              origin: FIELD_ORIGIN.JOIN,
            },
            useCustomColorRamp: false,
          },
        },
        [VECTOR_STYLES.LINE_COLOR]: {
          type: STYLE_TYPE.STATIC,
          options: { color: '#3d3d3d' },
        },
        [VECTOR_STYLES.LINE_WIDTH]: {
          type: STYLE_TYPE.STATIC,
          options: { size: 1 },
        },
      },
    },
  } as LayerDescriptor);

export const isoFromMapProperties = (
  properties: Record<string, unknown> | null | undefined
): string | undefined => {
  if (!properties) {
    return undefined;
  }
  const raw = properties.iso2 ?? properties.iso_2 ?? properties.ISO_A2 ?? properties.isoCode;
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }
  return raw.toUpperCase();
};

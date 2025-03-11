/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';

import { parsePath } from 'history';
import { useValues } from 'kea';

import {
  AreaSeries,
  Chart,
  CurveType,
  ScaleType,
  Settings,
  Tooltip,
  LEGACY_LIGHT_THEME,
} from '@elastic/charts';
import {
  EuiBadge,
  EuiCard,
  EuiFlexGroup,
  EuiI18nNumber,
  EuiIcon,
  EuiText,
  EuiLoadingChart,
  useEuiTheme,
} from '@elastic/eui';

import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';

import { i18n } from '@kbn/i18n';

import { DateHistogramIndexPatternColumn } from '@kbn/lens-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';

import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { KibanaLogic } from '../../../../shared/kibana';
import { withLensData } from '../../../hoc/with_lens_data';
import { COLLECTION_OVERVIEW_PATH } from '../../../routes';

import { FilterBy, getFormulaByFilter } from '../../../utils/get_formula_by_filter';

import { AnalyticsCollectionCardStyles } from './analytics_collection_card.styles';

enum ChartStatus {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  CONSTANT = 'constant',
}

const getCardTheme = (euiTheme: EuiThemeComputed) => ({
  [ChartStatus.DECREASE]: {
    area: euiThemeVars.euiColorVis7_behindText,
    areaOpacity: 0.2,
    icon: 'sortDown',
    line: euiThemeVars.euiColorVis7,
    lineOpacity: 0.5,
    text: '#996130',
  },
  [ChartStatus.CONSTANT]: {
    area: euiTheme.colors.mediumShade,
    areaOpacity: 0.2,
    icon: 'minus',
    line: euiTheme.colors.mediumShade,
    lineOpacity: 0.5,
    text: euiTheme.colors.darkShade,
  },
  [ChartStatus.INCREASE]: {
    area: euiThemeVars.euiColorVis0_behindText,
    areaOpacity: 0.2,
    icon: 'sortUp',
    line: euiThemeVars.euiColorVis0,
    lineOpacity: 0.5,
    text: '#387765',
  },
});

interface AnalyticsCollectionCardProps {
  collection: AnalyticsCollection;
  filterBy: FilterBy;
  isCreatedByEngine?: boolean;
  subtitle?: string;
}

interface AnalyticsCollectionCardLensProps {
  data: Array<[number, number]>;
  isLoading: boolean;
  metric: number | null;
  secondaryMetric: number | null;
}

const getChartStatus = (metric: number | null): ChartStatus => {
  if (metric && metric > 0) return ChartStatus.INCREASE;
  if (metric && metric < 0) return ChartStatus.DECREASE;
  return ChartStatus.CONSTANT;
};
export const AnalyticsCollectionCard: React.FC<
  AnalyticsCollectionCardProps & AnalyticsCollectionCardLensProps
> = ({ collection, isLoading, isCreatedByEngine, subtitle, data, metric, secondaryMetric }) => {
  const { euiTheme } = useEuiTheme();
  const { history, navigateToUrl } = useValues(KibanaLogic);
  const cardStyles = AnalyticsCollectionCardStyles(euiTheme);
  const status = getChartStatus(secondaryMetric);
  const CARD_THEME = getCardTheme(euiTheme)[status];
  const collectionViewUrl = generateEncodedPath(COLLECTION_OVERVIEW_PATH, {
    name: collection.name,
  });
  const handleCardClick = (event: MouseEvent) => {
    event?.preventDefault();

    navigateToUrl(collectionViewUrl);
  };

  return (
    <EuiCard
      titleSize="s"
      titleElement="h4"
      title={
        <>
          <span css={cardStyles.title}>{collection.name}</span>
          {isCreatedByEngine && (
            <EuiBadge color="hollow" iconType="link" css={cardStyles.badge}>
              {i18n.translate('xpack.enterpriseSearch.analytics.collection.badge', {
                defaultMessage: 'Engine',
              })}
            </EuiBadge>
          )}
        </>
      }
      textAlign="left"
      css={cardStyles.card}
      description={<span css={cardStyles.subtitle}>{subtitle}</span>}
      href={history.createHref(parsePath(collectionViewUrl))}
      onClick={handleCardClick}
      footer={
        isLoading ? (
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiLoadingChart size="m" />
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            alignItems="flexEnd"
            justifyContent="flexEnd"
            css={cardStyles.footer}
          >
            <EuiText size="s" color={CARD_THEME.text}>
              {secondaryMetric === null ? (
                i18n.translate('xpack.enterpriseSearch.analytics.collection.notAvailableLabel', {
                  defaultMessage: 'N/A',
                })
              ) : (
                <>
                  <EuiIcon type={CARD_THEME.icon} />
                  {secondaryMetric}%
                </>
              )}
            </EuiText>

            <EuiText color={CARD_THEME.text}>
              <h2>
                {metric === null ? (
                  i18n.translate('xpack.enterpriseSearch.analytics.collection.notAvailableLabel', {
                    defaultMessage: 'N/A',
                  })
                ) : (
                  <EuiI18nNumber value={metric} />
                )}
              </h2>
            </EuiText>
          </EuiFlexGroup>
        )
      }
    >
      {!isLoading && data?.some(([, y]) => y && y !== 0) && (
        <Chart size={['100%', 130]} css={cardStyles.chart}>
          <Settings
            // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
            baseTheme={LEGACY_LIGHT_THEME}
            theme={{
              areaSeriesStyle: {
                area: {
                  fill: CARD_THEME.area,
                  opacity: CARD_THEME.areaOpacity,
                },
                line: {
                  opacity: CARD_THEME.lineOpacity,
                  stroke: CARD_THEME.line,
                  strokeWidth: 2,
                },
              },
              chartMargins: { bottom: 0, left: 0, right: 0, top: 0 },
            }}
            showLegend={false}
            locale={i18n.getLocale()}
          />
          <Tooltip type="none" />
          <AreaSeries
            id={collection.name}
            data={data}
            xAccessor={0}
            yAccessors={[1]}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            curve={CurveType.CURVE_BASIS}
            yNice
          />
        </Chart>
      )}
    </EuiCard>
  );
};

const LENS_LAYERS = {
  metrics: {
    hitsTotal: 'hitsTotal',
    id: 'metrics',
    percentage: 'percentage',
  },
  trend: {
    id: 'trend',
    x: 'timeline',
    y: 'values',
  },
};
const initialValues = { data: [], isLoading: true, metric: null, secondaryMetric: null };

export const AnalyticsCollectionCardWithLens = withLensData<
  AnalyticsCollectionCardProps,
  AnalyticsCollectionCardLensProps
>(AnalyticsCollectionCard, {
  dataLoadTransform: (isLoading, adapters) =>
    isLoading || !adapters
      ? initialValues
      : {
          data:
            (adapters.tables?.tables[LENS_LAYERS.trend.id]?.rows?.map((row) => [
              row[LENS_LAYERS.trend.x] as number,
              row[LENS_LAYERS.trend.y] as number,
            ]) as Array<[number, number]>) || [],
          isLoading: false,
          metric:
            adapters.tables?.tables[LENS_LAYERS.metrics.id]?.rows?.[0]?.[
              LENS_LAYERS.metrics.hitsTotal
            ] ?? null,
          secondaryMetric:
            adapters.tables?.tables[LENS_LAYERS.metrics.id]?.rows?.[0]?.[
              LENS_LAYERS.metrics.percentage
            ] ?? null,
        },
  getAttributes: (dataView, formulaApi, { filterBy }) => {
    let metric = formulaApi.insertOrReplaceFormulaColumn(
      LENS_LAYERS.metrics.percentage,
      {
        formula: `round(((${getFormulaByFilter(filterBy)}/${getFormulaByFilter(
          filterBy,
          'previous'
        )})-1) * 100)`,
        label: ' ',
      },
      {
        columnOrder: [],
        columns: {},
      },
      dataView
    )!;
    metric = formulaApi.insertOrReplaceFormulaColumn(
      LENS_LAYERS.metrics.hitsTotal,
      { formula: getFormulaByFilter(filterBy), label: ' ' },
      metric,
      dataView
    )!;

    return {
      references: [
        {
          id: dataView.id!,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: dataView.id!,
          name: `indexpattern-datasource-layer-${LENS_LAYERS.trend.id}`,
          type: 'index-pattern',
        },
        {
          id: dataView.id!,
          name: `indexpattern-datasource-layer-${LENS_LAYERS.metrics.id}`,
          type: 'index-pattern',
        },
      ],
      state: {
        datasourceStates: {
          formBased: {
            layers: {
              [LENS_LAYERS.trend.id]: formulaApi.insertOrReplaceFormulaColumn(
                LENS_LAYERS.trend.y,
                {
                  formula: getFormulaByFilter(filterBy),
                },
                {
                  columnOrder: [],
                  columns: {
                    [LENS_LAYERS.trend.x]: {
                      dataType: 'date',
                      isBucketed: false,
                      label: 'Timestamp',
                      operationType: 'date_histogram',
                      params: { includeEmptyRows: true, interval: 'auto' },
                      scale: 'ordinal',
                      sourceField: dataView?.timeFieldName!,
                    } as DateHistogramIndexPatternColumn,
                  },
                },
                dataView!
              )!,
              [LENS_LAYERS.metrics.id]: metric,
            },
          },
        },
        filters: [],
        query: { language: 'kuery', query: '' },
        visualization: {
          layerId: [LENS_LAYERS.metrics.id],
          layerType: 'data',
          metricAccessor: LENS_LAYERS.metrics.hitsTotal,
          secondaryMetricAccessor: LENS_LAYERS.metrics.percentage,
          trendlineLayerId: LENS_LAYERS.trend.id,
          trendlineMetricAccessor: LENS_LAYERS.trend.y,
          trendlineTimeAccessor: LENS_LAYERS.trend.x,
        },
      },
      title: '',
      visualizationType: 'lnsMetric',
    };
  },
  initialValues,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { css } from '@emotion/react';

import {
  EuiFlexGroup,
  EuiI18nNumber,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiSkeletonRectangle,
  useEuiTheme,
} from '@elastic/eui';

import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

import { withLensData } from '../../../hoc/with_lens_data';

enum MetricStatus {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  CONSTANT = 'constant',
}
const getMetricTheme = (euiTheme: EuiThemeComputed, status: MetricStatus) =>
  ({
    [MetricStatus.DECREASE]: {
      color: euiThemeVars.euiColorVis7,
      icon: 'sortDown',
    },
    [MetricStatus.CONSTANT]: {
      color: euiTheme.colors.darkShade,
      icon: 'minus',
    },
    [MetricStatus.INCREASE]: {
      color: euiThemeVars.euiColorVis0,
      icon: 'sortUp',
    },
  }[status]);

const getMetricStatus = (metric: number): MetricStatus => {
  if (metric > 0) return MetricStatus.INCREASE;
  if (metric < 0) return MetricStatus.DECREASE;
  return MetricStatus.CONSTANT;
};

interface AnalyticsCollectionViewMetricProps {
  getFormula: (shift?: string) => string;
  isSelected?: boolean;
  name: string;
  onClick(event: React.MouseEvent<HTMLButtonElement>): void;
}

interface AnalyticsCollectionViewMetricLensProps {
  isLoading: boolean;
  metric: number | null;
  secondaryMetric: number | null;
}

export const AnalyticsCollectionViewMetric: React.FC<
  AnalyticsCollectionViewMetricProps & AnalyticsCollectionViewMetricLensProps
> = ({ isLoading, isSelected, metric, name, onClick, secondaryMetric }) => {
  const { euiTheme } = useEuiTheme();
  const [displayMetric, setDisplayMetric] = useState(metric);
  const [displaySecondaryMetric, setDisplaySecondaryMetric] = useState(secondaryMetric);

  useEffect(() => {
    if (metric !== null) {
      setDisplayMetric(metric);
    }
  }, [metric]);

  useEffect(() => {
    if (secondaryMetric !== null) {
      setDisplaySecondaryMetric(metric);
    }
  }, [secondaryMetric]);

  const { icon, color } = getMetricTheme(euiTheme, getMetricStatus(displaySecondaryMetric || 0));

  return (
    <EuiPanel
      grow
      hasBorder
      hasShadow={false}
      onClick={onClick}
      color={isSelected ? 'primary' : 'plain'}
      css={
        isSelected
          ? css`
              border: 1px solid ${euiTheme.colors.primary};
              position: relative;
              overflow: hidden;
            `
          : css`
              position: relative;
              overflow: hidden;
            `
      }
    >
      {isLoading && <EuiProgress size="xs" color="success" position="absolute" />}
      <EuiFlexGroup direction="column">
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
          <EuiText size="s">
            <p>{name}</p>
          </EuiText>
          <EuiText size="s" color={color}>
            <span>
              {displaySecondaryMetric === null ? (
                i18n.translate('xpack.enterpriseSearch.analytics.collection.notAvailableLabel', {
                  defaultMessage: 'N/A',
                })
              ) : (
                <>
                  <EuiIcon type={icon} />
                  {displaySecondaryMetric + '%'}
                </>
              )}
            </span>
          </EuiText>
        </EuiFlexGroup>
        {isLoading && displayMetric === null ? (
          <EuiSkeletonRectangle height={euiTheme.size.xl} width="100%" />
        ) : (
          <EuiText color={isSelected ? euiTheme.colors.primaryText : color}>
            <h2>
              {displayMetric === null ? (
                i18n.translate('xpack.enterpriseSearch.analytics.collection.notAvailableLabel', {
                  defaultMessage: 'N/A',
                })
              ) : (
                <EuiI18nNumber value={displayMetric} />
              )}
            </h2>
          </EuiText>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const LENS_LAYERS = {
  metrics: {
    hitsTotal: 'hitsTotal',
    id: 'metrics',
    percentage: 'percentage',
  },
};
const initialValues = { isLoading: true, metric: null, secondaryMetric: null };

export const AnalyticsCollectionViewMetricWithLens = withLensData<
  AnalyticsCollectionViewMetricProps,
  AnalyticsCollectionViewMetricLensProps
>(AnalyticsCollectionViewMetric, {
  dataLoadTransform: (isLoading, adapters) =>
    isLoading || !adapters
      ? initialValues
      : {
          isLoading,
          metric:
            adapters.tables?.tables[LENS_LAYERS.metrics.id]?.rows?.[0]?.[
              LENS_LAYERS.metrics.hitsTotal
            ] ?? null,
          secondaryMetric:
            adapters.tables?.tables[LENS_LAYERS.metrics.id]?.rows?.[0]?.[
              LENS_LAYERS.metrics.percentage
            ] ?? null,
        },
  getAttributes: (dataView, formulaApi, props) => {
    let metric = formulaApi.insertOrReplaceFormulaColumn(
      LENS_LAYERS.metrics.percentage,
      {
        formula: `round((${props.getFormula()}/${props.getFormula('previous')}-1) * 100)`,
      },
      {
        columnOrder: [],
        columns: {},
      },
      dataView
    )!;
    metric = formulaApi.insertOrReplaceFormulaColumn(
      LENS_LAYERS.metrics.hitsTotal,
      { formula: props.getFormula() },
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
          name: `indexpattern-datasource-layer-${LENS_LAYERS.metrics.id}`,
          type: 'index-pattern',
        },
      ],
      state: {
        datasourceStates: {
          formBased: {
            layers: {
              [LENS_LAYERS.metrics.id]: metric,
            },
          },
        },
        filters: [],
        query: { language: 'kuery', query: '' },
        visualization: {
          layerId: [LENS_LAYERS.metrics.id],
          layerType: 'data',
          layers: [],
          metricAccessor: LENS_LAYERS.metrics.hitsTotal,
          secondaryMetricAccessor: LENS_LAYERS.metrics.percentage,
        },
      },
      title: '',
      visualizationType: 'lnsMetric',
    };
  },
  initialValues,
});

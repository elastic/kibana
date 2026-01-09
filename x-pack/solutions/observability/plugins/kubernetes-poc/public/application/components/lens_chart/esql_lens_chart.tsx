/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { KUBERNETES_POC_LENS_METRIC_COLOR } from '../../constants';

export type ESQLVisualizationType = 'lnsXY' | 'lnsMetric' | 'lnsPie';

export interface ESQLLensChartProps {
  /**
   * The ES|QL query to execute
   */
  esqlQuery: string;
  /**
   * Time range for the visualization
   */
  timeRange: TimeRange;
  /**
   * Type of visualization to render
   */
  visualizationType: ESQLVisualizationType;
  /**
   * Visualization-specific state configuration
   */
  visualizationState: Record<string, unknown>;
  /**
   * Height of the chart in pixels
   */
  height?: number;
  /**
   * Optional title for the visualization
   */
  title?: string;
  /**
   * Optional CSS class name
   */
  className?: string;
  /**
   * Optional data-test-subj for testing
   */
  'data-test-subj'?: string;
}

/**
 * Creates Lens attributes for an ES|QL-based visualization.
 * This is a simplified helper for creating text-based (ES|QL) Lens visualizations.
 */
function createESQLLensAttributes(
  esqlQuery: string,
  visualizationType: ESQLVisualizationType,
  visualizationState: Record<string, unknown>,
  title?: string
): TypedLensByValueInput['attributes'] {
  const layerId = 'layer_0';
  const metricDefaults =
    visualizationType === 'lnsMetric' && !('color' in visualizationState)
      ? { color: KUBERNETES_POC_LENS_METRIC_COLOR, applyColorTo: 'value' }
      : {};

  return {
    title: title ?? '',
    description: '',
    visualizationType,
    type: 'lens',
    references: [],
    state: {
      visualization: {
        ...metricDefaults,
        ...visualizationState,
        layerId,
        layerType: 'data',
      },
      query: {
        esql: esqlQuery,
      },
      filters: [],
      datasourceStates: {
        textBased: {
          layers: {
            [layerId]: {
              index: 'esql-query-index',
              timeField: '@timestamp',
              query: {
                esql: esqlQuery,
              },
              columns: [],
            },
          },
        },
      },
    },
  } as TypedLensByValueInput['attributes'];
}

/**
 * A Lens chart component that renders ES|QL query results.
 * Provides a simplified interface for creating ES|QL-based visualizations
 * without needing to construct full Lens attributes manually.
 */
export const ESQLLensChart: React.FC<ESQLLensChartProps> = ({
  esqlQuery,
  timeRange,
  visualizationType,
  visualizationState,
  height = 200,
  title,
  className,
  'data-test-subj': dataTestSubj,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes = useMemo(
    () => createESQLLensAttributes(esqlQuery, visualizationType, visualizationState, title),
    [esqlQuery, visualizationType, visualizationState, title]
  );

  const style = useMemo(
    () => ({
      height: `${height}px`,
      width: '100%',
    }),
    [height]
  );

  return (
    <div
      className={className}
      data-test-subj={dataTestSubj}
      css={css`
        .expExpressionRenderer__expression {
          padding: 0 !important;
        }
        .legacyMtrVis__container {
          padding: 0;
        }
      `}
    >
      <LensComponent
        id={dataTestSubj ?? 'esqlLensChart'}
        attributes={attributes}
        timeRange={timeRange}
        style={style}
        viewMode="view"
        noPadding
        withDefaultActions={false}
        disableTriggers
        showInspector={false}
        syncCursor={false}
        syncTooltips={false}
      />
    </div>
  );
};

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

export interface LensChartProps {
  /**
   * The Lens visualization attributes
   */
  attributes: TypedLensByValueInput['attributes'];
  /**
   * Time range for the visualization
   */
  timeRange: TimeRange;
  /**
   * Height of the chart in pixels
   */
  height?: number;
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
 * A minimal LensEmbeddable wrapper that renders a Lens visualization
 * without any chrome, actions, or panel decorations.
 *
 * This is designed for dashboard-style visualizations where you want
 * the chart only, without edit/inspect buttons or panel borders.
 */
export const LensChart: React.FC<LensChartProps> = ({
  attributes,
  timeRange,
  height = 200,
  className,
  'data-test-subj': dataTestSubj,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

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
        id={dataTestSubj ?? 'lensChart'}
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

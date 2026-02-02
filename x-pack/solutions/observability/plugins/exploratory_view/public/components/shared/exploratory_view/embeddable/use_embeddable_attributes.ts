/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibanaSpace, useTheme } from '@kbn/observability-shared-plugin/public';
import { ExploratoryEmbeddableComponentProps } from './embeddable';
import { LayerConfig, LensAttributes } from '../configurations/lens_attributes';
import { getLayerConfigs } from '../hooks/use_lens_attributes';
import { obsvReportConfigMap } from '../obsv_exploratory_view';
import { ReportTypes } from '../../../..';
import { SingleMetricLensAttributes } from '../configurations/lens_attributes/single_metric_attributes';
import { HeatMapLensAttributes } from '../configurations/lens_attributes/heatmap_attributes';

export const useEmbeddableAttributes = ({
  attributes,
  dataViewState,
  reportType,
  reportConfigMap = {},
  lensFormulaHelper,
  dslFilters,
}: ExploratoryEmbeddableComponentProps) => {
  const spaceId = useKibanaSpace();
  const theme = useTheme();

  return useMemo(() => {
    try {
      const layerConfigs: LayerConfig[] = getLayerConfigs(
        attributes,
        reportType,
        theme,
        dataViewState,
        { ...reportConfigMap, ...obsvReportConfigMap },
        spaceId.space?.id
      );

      if (reportType === ReportTypes.SINGLE_METRIC) {
        const lensAttributes = new SingleMetricLensAttributes(
          layerConfigs,
          reportType,
          lensFormulaHelper!,
          dslFilters
        );
        return lensAttributes?.getJSON('lnsLegacyMetric');
      } else if (reportType === ReportTypes.HEATMAP) {
        const lensAttributes = new HeatMapLensAttributes(
          layerConfigs,
          reportType,
          lensFormulaHelper!
        );
        return lensAttributes?.getJSON('lnsHeatmap');
      } else {
        const lensAttributes = new LensAttributes(
          layerConfigs,
          reportType,
          lensFormulaHelper,
          dslFilters
        );
        return lensAttributes?.getJSON();
      }
    } catch (error) {
      console.error(error);
    }
  }, [
    attributes,
    dataViewState,
    dslFilters,
    lensFormulaHelper,
    reportConfigMap,
    reportType,
    spaceId.space?.id,
    theme,
  ]);
};

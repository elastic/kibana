/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import type { LensBreakdownConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { PAGE_SIZE_OPTIONS } from '../constants';

export const useMetricsCharts = ({ dataViewId }: { dataViewId?: string }) => {
  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('host');
    const { cpu, disk, memory, network } = await model.metrics.getCharts({
      schemas: ['ecs', 'semconv'],
    });

    return [cpu.xy.cpuUsage].map((chart) => ({
      ...chart,
      layers: chart.layers.map((layer) =>
        layer.type === 'series'
          ? {
              ...layer,
              breakdown: {
                type: 'topValues',
                field: 'host.name',
                size: PAGE_SIZE_OPTIONS.at(-1),
              } as LensBreakdownConfig,
            }
          : layer
      ),
      ...(dataViewId && {
        dataset: {
          index: dataViewId,
        },
      }),
    }));
  }, [dataViewId]);

  return charts;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  findInventoryFields,
  type InventoryItemType,
} from '@kbn/metrics-data-access-plugin/common';
import { buildCombinedAssetFilter } from '../../../../utils/filters/build';
import { useReloadRequestTimeContext } from '../../../../hooks/use_reload_request_time';
import { useLogsCharts } from '../../hooks/use_log_charts';
import { Kpi } from '../../components/kpis/kpi';

interface Props {
  dataView?: DataView;
  assetId: string;
  assetType: InventoryItemType;
  dateRange: TimeRange;
}

export const LogsContent = ({ assetId, assetType, dataView, dateRange }: Props) => {
  const { reloadRequestTime } = useReloadRequestTimeContext();

  const filters = useMemo(() => {
    return [
      buildCombinedAssetFilter({
        field: findInventoryFields(assetType).id,
        values: [assetId],
        dataView,
      }),
    ];
  }, [dataView, assetId, assetType]);

  const { charts } = useLogsCharts({
    dataViewId: dataView?.id,
  });

  return (
    <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="infraAssetDetailsLogsGrid">
      {charts.map((chartProps, index) => (
        <EuiFlexItem key={index}>
          <Kpi
            {...chartProps}
            dateRange={dateRange}
            filters={filters}
            lastReloadRequestTime={reloadRequestTime}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

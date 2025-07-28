/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { EuiFlexGroup } from '@elastic/eui';
import {
  findInventoryFields,
  type InventoryItemType,
} from '@kbn/metrics-data-access-plugin/common';
import { buildCombinedAssetFilter } from '../../../../../utils/filters/build';
import { HostKpiCharts } from '../../../components/kpis/host_kpi_charts';
import { ContainerKpiCharts } from '../../../components/kpis/container_kpi_charts';
import { useReloadRequestTimeContext } from '../../../../../hooks/use_reload_request_time';

interface Props {
  dataView?: DataView;
  entityId: string;
  entityType: InventoryItemType;
  dateRange: TimeRange;
}

export const KPIGrid = ({ entityId, entityType, dataView, dateRange }: Props) => {
  const { reloadRequestTime } = useReloadRequestTimeContext();

  const filters = useMemo(() => {
    return [
      buildCombinedAssetFilter({
        field: findInventoryFields(entityType).id,
        values: [entityId],
        dataView,
      }),
    ];
  }, [dataView, entityId, entityType]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="infraAssetDetailsKPIGrid">
      {entityType === 'host' ? (
        <HostKpiCharts
          dataView={dataView}
          filters={filters}
          dateRange={dateRange}
          lastReloadRequestTime={reloadRequestTime}
        />
      ) : (
        <ContainerKpiCharts
          dataView={dataView}
          filters={filters}
          dateRange={dateRange}
          lastReloadRequestTime={reloadRequestTime}
        />
      )}
    </EuiFlexGroup>
  );
};

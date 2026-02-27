/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import {
  getLogsLocatorFromUrlService,
  getNodeQuery,
  getTimeRange,
} from '@kbn/logs-shared-plugin/common';
import {
  findInventoryFields,
  type InventoryItemType,
} from '@kbn/metrics-data-access-plugin/common';

import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';

type RedirectToNodeLogsType = RouteComponentProps<{
  nodeId: string;
  nodeType: InventoryItemType;
  logViewId?: string;
}>;

export const RedirectToNodeLogs = ({
  match: {
    params: { nodeId, nodeType },
  },
  location,
}: RedirectToNodeLogsType) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const logsLocator = getLogsLocatorFromUrlService(share.url)!;

  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  useEffect(() => {
    logsLocator.navigate(
      {
        query: getNodeQuery({
          nodeField: findInventoryFields(nodeType).id,
          nodeId,
          filter,
        }),
        timeRange: getTimeRange(time),
      },
      { replace: true }
    );
  }, [filter, logsLocator, nodeId, nodeType, time]);

  return null;
};

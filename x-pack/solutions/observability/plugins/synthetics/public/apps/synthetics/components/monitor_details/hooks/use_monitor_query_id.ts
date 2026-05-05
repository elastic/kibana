/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from './use_selected_monitor';
import { useGetUrlParams } from '../../../hooks';

export const useMonitorQueryId = () => {
  const { monitor, isRemote } = useSelectedMonitor();
  const { monitorId: urlMonitorId } = useParams<{ monitorId: string }>();
  const { monitorQueryId: urlMonitorQueryId } = useGetUrlParams();

  // For remote monitors, prefer the explicit monitorQueryId URL param (the `monitor.id`
  // field in ping documents, which may differ from configId for project monitors).
  // Fall back to the URL path monitorId (configId) if monitorQueryId isn't provided.
  return monitor?.[ConfigKey.MONITOR_QUERY_ID] ?? (isRemote ? (urlMonitorQueryId || urlMonitorId) : undefined);
};

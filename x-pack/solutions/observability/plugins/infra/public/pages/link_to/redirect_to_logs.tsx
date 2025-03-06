/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLogsLocatorFromUrlService, getTimeRange } from '@kbn/logs-shared-plugin/common';
import { getFilterFromLocation, getTimeFromLocation } from './query_params';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

export const RedirectToLogs = () => {
  const location = useLocation();

  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const logsLocator = getLogsLocatorFromUrlService(share.url)!;

  const filter = getFilterFromLocation(location);
  const time = getTimeFromLocation(location);

  useEffect(() => {
    logsLocator.navigate(
      {
        query: { language: 'kuery', query: filter },
        timeRange: getTimeRange(time),
      },
      { replace: true }
    );
  }, [filter, logsLocator, time]);

  return null;
};

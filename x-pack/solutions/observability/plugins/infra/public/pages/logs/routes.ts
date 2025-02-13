/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logsAnomaliesTitle, logCategoriesTitle } from '../../translations';

export interface LogsRoute {
  id: string;
  title: string;
  path: string;
}

export interface LogsAppRoutes {
  logsAnomalies: LogsRoute;
  logsCategories: LogsRoute;
}

export const getLogsAppRoutes = () => {
  const routes: LogsAppRoutes = {
    logsAnomalies: {
      id: 'anomalies',
      title: logsAnomaliesTitle,
      path: '/anomalies',
    },
    logsCategories: {
      id: 'log-categories',
      title: logCategoriesTitle,
      path: '/log-categories',
    },
  };

  return routes;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '../../common/lib/kibana';

export const DATA_VIEW_LOGGER_NAME = 'dataViewManager';

export const useDataViewManagerLogger = (...childContextPaths: string[]) => {
  const services = useKibana().services;
  childContextPaths.unshift(DATA_VIEW_LOGGER_NAME);
  return services.logger.get(...childContextPaths);
};

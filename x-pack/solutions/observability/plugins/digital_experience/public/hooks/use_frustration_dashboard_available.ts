/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibanaServices } from './use_kibana_services';

/** Whether the optional plugins the frustration dashboard is built with are all installed. */
export const useFrustrationDashboardAvailable = (): boolean => {
  const { dashboard, lens, dataViews } = useKibanaServices();
  return Boolean(dashboard && lens && dataViews);
};

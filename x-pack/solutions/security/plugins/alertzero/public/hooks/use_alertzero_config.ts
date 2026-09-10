/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AlertZeroClientConfig } from '../types';

const DEFAULT_CONFIG: AlertZeroClientConfig = {
  enabled: true,
  ui: { useMockData: true },
};

/** Browser-exposed `xpack.alertZero` config. Defaults to mock presentation when the provider is absent. */
export const useAlertZeroConfig = (): AlertZeroClientConfig => {
  const { services } = useKibana<{ alertZeroConfig?: AlertZeroClientConfig }>();
  return services.alertZeroConfig ?? DEFAULT_CONFIG;
};

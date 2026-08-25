/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { PndClientConfig } from '../types';

const DEFAULT_CONFIG: PndClientConfig = {
  enabled: true,
  ui: { useMockData: true },
};

/** Browser-exposed `xpack.pnd` config. Defaults to mock presentation when the provider is absent. */
export const usePndConfig = (): PndClientConfig => {
  const { services } = useKibana<{ pndConfig?: PndClientConfig }>();
  return services.pndConfig ?? DEFAULT_CONFIG;
};

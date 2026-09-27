/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERTZERO_FEATURE_ID } from '../../common/constants';

/** True when the current user can mutate AlertZero worker settings and enablement. */
export const useCanWriteAlertZero = (): boolean => {
  const { services } = useKibana<CoreStart>();
  return services.application.capabilities[ALERTZERO_FEATURE_ID]?.write === true;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INFRA_POD_SCHEMA_SELECTOR_DEFAULT,
  INFRA_POD_SCHEMA_SELECTOR_FEATURE_FLAG,
} from '../../common/pod_schema_selector_feature_flag';
import { useKibanaContextForPlugin } from './use_kibana';

/** Temporary flag until the feature is fully enabled. */
export const useIsPodSchemaSelectorEnabled = (): boolean => {
  const { services } = useKibanaContextForPlugin();

  return services.featureFlags.useBooleanValue(
    INFRA_POD_SCHEMA_SELECTOR_FEATURE_FLAG,
    INFRA_POD_SCHEMA_SELECTOR_DEFAULT
  );
};

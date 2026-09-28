/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_INFRA_POD_SCHEMA_SELECTOR_ENABLED_DEFAULT,
  OBSERVABILITY_INFRA_POD_SCHEMA_SELECTOR_ENABLED_FEATURE_FLAG,
} from '../../common/pod_schema_selector_feature_flag';
import { useKibanaContextForPlugin } from './use_kibana';

/** Temporary release gate. Default off so the unfinished pod Schema selector does not ship enabled. */
export const useIsPodSchemaSelectorEnabled = (): boolean => {
  const { services } = useKibanaContextForPlugin();

  return services.featureFlags.useBooleanValue(
    OBSERVABILITY_INFRA_POD_SCHEMA_SELECTOR_ENABLED_FEATURE_FLAG,
    OBSERVABILITY_INFRA_POD_SCHEMA_SELECTOR_ENABLED_DEFAULT
  );
};

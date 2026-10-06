/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import {
  OBSERVABILITY_INFRA_POD_SCHEMA_SELECTOR_ENABLED_DEFAULT,
  OBSERVABILITY_INFRA_POD_SCHEMA_SELECTOR_ENABLED_FEATURE_FLAG,
} from '../../../common/pod_schema_selector_feature_flag';
import type { InfraPluginStartServicesAccessor } from '../../types';

interface PodSchemaSelectorDeps {
  getStartServices: InfraPluginStartServicesAccessor;
}

/**
 * Server twin of the browser's `useIsPodSchemaSelectorEnabled`.
 *
 * While the flag is off a pod rule evaluates as ECS whatever it stored, so a leftover
 * Hosts `semconv` cannot query kubeletstats.
 */
export const createIsPodSchemaSelectorEnabled =
  ({ getStartServices }: PodSchemaSelectorDeps) =>
  async (): Promise<boolean> => {
    const [coreStart] = await getStartServices();

    return firstValueFrom(
      coreStart.featureFlags.getBooleanValue$(
        OBSERVABILITY_INFRA_POD_SCHEMA_SELECTOR_ENABLED_FEATURE_FLAG,
        OBSERVABILITY_INFRA_POD_SCHEMA_SELECTOR_ENABLED_DEFAULT
      )
    );
  };

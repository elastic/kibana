/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  EnabledProfilingSchemasStatus,
  ProfilingSchemasStatus,
  UniversalProfilingSchemaStatus,
  UniversalProfilingStatus,
} from '@kbn/profiling-utils';
import { createGetOtelStatusService } from '../../otel/services/status';
import { createGetStatusService as createGetUniversalProfilingStatusService } from '../../universal_profiling/services/status';
import { isServerless } from '../../utils/is_serverless';
import type { RegisterServicesParams } from '../register_services';

export interface ProfilingStatusParams {
  soClient: SavedObjectsClientContract;
  esClient: IScopedClusterClient;
  spaceId?: string;
  abortSignal?: AbortSignal;
}

const toUniversalProfilingSchemaStatus = ({
  has_setup: hasSetup,
  has_data: hasData,
  pre_8_9_1_data: hasLegacyData,
}: UniversalProfilingStatus): UniversalProfilingSchemaStatus => ({
  isAvailable: true,
  hasSetup,
  hasData,
  hasLegacyData,
});

const UNAVAILABLE_UNIVERSAL_PROFILING_SCHEMA_STATUS: UniversalProfilingSchemaStatus = {
  isAvailable: false,
  hasSetup: false,
  hasData: false,
  hasLegacyData: false,
};

export function createGetProfilingStatusService(params: RegisterServicesParams) {
  const { buildFlavor, createProfilingEsClient, logger } = params;
  const getOtelStatus = createGetOtelStatusService(params);
  const getUniversalProfilingStatus = createGetUniversalProfilingStatusService(params);
  const isUniversalProfilingAvailable = !isServerless(buildFlavor);

  return async ({
    esClient,
    soClient,
    spaceId,
    abortSignal,
  }: ProfilingStatusParams): Promise<ProfilingSchemasStatus> => {
    const client = createProfilingEsClient({ esClient: esClient.asInternalUser, abortSignal });
    const { profiling } = await client.universalProfiling.status();

    if (!profiling.enabled) {
      return { isEnabled: false };
    }

    const [otel, universalProfiling] = await Promise.all([
      getOtelStatus({ esClient, abortSignal }),
      isUniversalProfilingAvailable
        ? getUniversalProfilingStatus({ esClient, soClient, spaceId, abortSignal }).then(
            toUniversalProfilingSchemaStatus
          )
        : UNAVAILABLE_UNIVERSAL_PROFILING_SCHEMA_STATUS,
    ]);

    const status: EnabledProfilingSchemasStatus = { isEnabled: true, otel, universalProfiling };
    logger.debug(() => `Profiling status: ${JSON.stringify(status, null, 2)}`);
    return status;
  };
}

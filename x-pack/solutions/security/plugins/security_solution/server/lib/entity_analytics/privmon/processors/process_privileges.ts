/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import pmap from 'p-map';
import type { PrivmonPrivilegeDoc } from '../../../../../common/api/entity_analytics/privmon';
import type { AssetCriticalityService } from '../../asset_criticality';
import type { PrivmonDataClient } from '../privmon_data_client';
import type { ProcessorResult } from './types';

const MAX_CONCURRENCY = 10;

export const processPrivileges = async ({
  privileges,
  assetCriticalityService,
  esClient,
  logger,
  privmonDataClient,
}: {
  privileges: PrivmonPrivilegeDoc[];
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
  privmonDataClient: PrivmonDataClient;
}): Promise<ProcessorResult> => {
  logger.info(`processPrivileges ${privileges}`);

  if (privileges.length === 0) {
    return {
      privilegedUsers: [],
    };
  }

  const results = await pmap(
    privileges,
    async (privilege) => {
      return processPrivilege({
        privilege,
        assetCriticalityService,
        esClient,
        logger,
        privmonDataClient,
      });
    },
    { concurrency: MAX_CONCURRENCY }
  );

  return {
    privilegedUsers: results.flatMap((result) => result.privilegedUsers),
  };
};

const processPrivilege = async ({
  privilege,
  assetCriticalityService,
  esClient,
  logger,
  privmonDataClient,
}: {
  privilege: PrivmonPrivilegeDoc;
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
  privmonDataClient: PrivmonDataClient;
}): Promise<ProcessorResult> => {
  logger.info(`processPrivilege ${privilege}`);
  return {
    privilegedUsers: [],
  };
};

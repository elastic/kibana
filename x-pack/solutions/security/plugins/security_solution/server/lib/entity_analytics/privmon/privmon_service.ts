/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  PrivmonLoginDoc,
  PrivmonPrivilegeDoc,
} from '../../../../common/api/entity_analytics/privmon';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import type { PrivmonDataClient, PrivmonSearchOptions } from './privmon_data_client';
import type { LatestTaskStateSchema } from './task/state';
import { processLogins, processPrivileges } from './processors';
import { mergePrivilegedUsersByUser } from './utils';
export interface UpdatePrivilegedUsersParams {
  timestamps: LatestTaskStateSchema['timestamps'];
}

export interface UpdatePrivilegedUsersResponse {
  errors: string[];
  usersUpdated: number;
  usersCreated: number;
  timestamps: LatestTaskStateSchema['timestamps'];
}

export interface PrivmonService {
  updatePrivilegedUsers: (
    params: UpdatePrivilegedUsersParams
  ) => Promise<UpdatePrivilegedUsersResponse>;
}

export interface PrivmonServiceFactoryParams {
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
  privmonDataClient: PrivmonDataClient;
  namespace: string;
}

export const privmonServiceFactory = ({
  assetCriticalityService,
  esClient,
  logger,
  privmonDataClient,
  namespace,
}: PrivmonServiceFactoryParams): PrivmonService => ({
  updatePrivilegedUsers: async (params) => {
    logger.info(`updatePrivmon ${params}`);

    const { privileges, logins } = await getNextData(privmonDataClient, params);

    logger.info(`privileges: ${privileges.length}, logins: ${logins.length}`);
    logger.debug(`privileges: ${JSON.stringify(privileges)}`);
    logger.debug(`logins: ${JSON.stringify(logins)}`);

    const privilegeResult = await processPrivileges({
      privileges,
      assetCriticalityService,
      esClient,
      logger,
      privmonDataClient,
    });

    const loginResult = await processLogins({
      logins,
      assetCriticalityService,
      esClient,
      logger,
      privmonDataClient,
    });

    const users = mergePrivilegedUsersByUser([
      ...privilegeResult.privilegedUsers,
      ...loginResult.privilegedUsers,
    ]);

    const { created: usersCreated, updated: usersUpdated } =
      await privmonDataClient.bulkUpsertUsers(users);

    const { timestamps } = getLastProcessedData(logins, privileges, params);

    return Promise.resolve({
      errors: [],
      usersUpdated,
      usersCreated,
      timestamps,
    });
  },
});

interface Queries {
  logins: PrivmonSearchOptions;
  privileges: PrivmonSearchOptions;
}

const afterTimestampQuery = (timestamp?: string): PrivmonSearchOptions => {
  const query: PrivmonSearchOptions = {
    sort: [{ 'event.ingested': 'asc' }],
    size: 100,
  };

  if (timestamp) {
    query.query = {
      range: {
        'event.ingested': {
          gt: timestamp,
        },
      },
    };
  }

  return query;
};

const getsearchRequests = (params: UpdatePrivilegedUsersParams): Queries => {
  return {
    privileges: afterTimestampQuery(params?.timestamps?.lastProcessedPrivilege),
    logins: afterTimestampQuery(params?.timestamps?.lastProcessedLogin),
  };
};

const getNextData = async (
  privmonDataClient: PrivmonDataClient,
  params: UpdatePrivilegedUsersParams
) => {
  const requests = getsearchRequests(params);

  const [logins, privileges] = await Promise.all([
    privmonDataClient.searchLogins(requests.logins),
    privmonDataClient.searchPrivileges(requests.privileges),
  ]);

  return { logins: logins.records, privileges: privileges.records };
};

const getLastProcessedData = (
  logins: PrivmonLoginDoc[],
  privileges: PrivmonPrivilegeDoc[],
  params: UpdatePrivilegedUsersParams
): {
  timestamps: LatestTaskStateSchema['timestamps'];
} => {
  const lastLoginTimestamp = logins.length
    ? logins[logins.length - 1].event.ingested
    : params.timestamps?.lastProcessedLogin;
  const lastPrivilegeTimestamp = privileges.length
    ? privileges[privileges.length - 1].event.ingested
    : params.timestamps?.lastProcessedPrivilege;

  return {
    timestamps: {
      lastProcessedLogin: lastLoginTimestamp,
      lastProcessedPrivilege: lastPrivilegeTimestamp,
    },
  };
};

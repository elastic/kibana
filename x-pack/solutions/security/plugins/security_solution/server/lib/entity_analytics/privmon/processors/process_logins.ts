/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import pmap from 'p-map';
import _ from 'lodash';
import { OBSERVATION_TYPES } from '../../../../../common/entity_analytics/privmon';
import type {
  AssetCriticalityRecord,
  CriticalityLevel,
} from '../../../../../common/entity_analytics/asset_criticality/types';
import type {
  PrivmonLoginDoc,
  PrivilegedUserDoc,
} from '../../../../../common/api/entity_analytics/privmon';
import type { AssetCriticalityService } from '../../asset_criticality';
import type { PrivmonDataClient } from '../privmon_data_client';
import type { ProcessorResult, UserAndObservations } from './types';
import { mergeObservationsByUser } from './utils';

const MAX_CONCURRENCY = 10;

const PRIVILEGED_CRITICALITY_LEVELS: CriticalityLevel[] = ['extreme_impact', 'high_impact'];

export const processLogins = async ({
  logins,
  assetCriticalityService,
  esClient,
  logger,
  privmonDataClient,
}: {
  logins: PrivmonLoginDoc[];
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
  privmonDataClient: PrivmonDataClient;
}): Promise<ProcessorResult> => {
  logger.info(`processLogins ${logins}`);

  if (logins.length === 0) {
    return {
      privilegedUsers: [],
    };
  }

  const criticalitiesByHostname = await getHostCriticalities({
    hostnames: logins.map((login) => login.host.name).filter((hostname) => !!hostname) as string[],
    assetCriticalityService,
  });

  const results = await pmap(
    logins,
    async (login) => {
      const hostAssetCriticalityRecord = login.host.name
        ? criticalitiesByHostname[login.host.name]
        : undefined;
      return processLogin({
        login,
        hostAssetCriticalityRecord,
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

const getHostCriticalities = async ({
  hostnames,
  assetCriticalityService,
}: {
  hostnames: string[];
  assetCriticalityService: AssetCriticalityService;
}): Promise<Record<string, AssetCriticalityRecord>> => {
  const criticalities = await assetCriticalityService.getCriticalitiesByIdentifiers(
    hostnames.map((hostname) => ({
      id_field: 'host.name',
      id_value: hostname,
    }))
  );

  return _.keyBy(criticalities, 'id_value');
};

const processLogin = async ({
  login,
  hostAssetCriticalityRecord,
  esClient,
  logger,
  privmonDataClient,
}: {
  login: PrivmonLoginDoc;
  hostAssetCriticalityRecord?: AssetCriticalityRecord;
  esClient: ElasticsearchClient;
  logger: Logger;
  privmonDataClient: PrivmonDataClient;
}): Promise<ProcessorResult> => {
  const usersAndObservations = await getUsersAndObservations({
    login,
    hostAssetCriticalityRecord,
    logger,
    privmonDataClient,
  });

  if (usersAndObservations.length === 0) {
    return {
      privilegedUsers: [],
    };
  }

  const mergedUsersAndObservations = mergeObservationsByUser(usersAndObservations);

  return {
    privilegedUsers: mergedUsersAndObservations.map((userAndObservations) =>
      loginDocToPrivilegedUser(login, userAndObservations)
    ),
  };
};

const loginDocToPrivilegedUser = (
  login: PrivmonLoginDoc,
  { observations, user }: UserAndObservations
): PrivilegedUserDoc => {
  return {
    user,
    active: true,
    '@timestamp': login['@timestamp'],
    created_at: new Date().toISOString(),
    observations,
  };
};

const getUsersAndObservations = async ({
  login,
  hostAssetCriticalityRecord,
  logger,
  privmonDataClient,
}: {
  login: PrivmonLoginDoc;
  hostAssetCriticalityRecord?: AssetCriticalityRecord;
  logger: Logger;
  privmonDataClient: PrivmonDataClient;
}): Promise<UserAndObservations[]> => {
  const observations: UserAndObservations[] = [];

  const criticalHostObservation = loginToCriticalHostObservation({
    login,
    hostAssetCriticalityRecord,
  });

  if (criticalHostObservation) {
    observations.push(criticalHostObservation);
  }

  return observations;
};

const loginToCriticalHostObservation = ({
  login,
  hostAssetCriticalityRecord,
}: {
  login: PrivmonLoginDoc;
  hostAssetCriticalityRecord?: AssetCriticalityRecord;
}): UserAndObservations | undefined => {
  if (!hostAssetCriticalityRecord) {
    return;
  }

  if (PRIVILEGED_CRITICALITY_LEVELS.includes(hostAssetCriticalityRecord.criticality_level)) {
    return {
      user: login.user,
      observations: [
        {
          observation_type: OBSERVATION_TYPES.LOGIN.CRITICAL_HOST,
          summary: `User logged into host '${hostAssetCriticalityRecord.id_value}' with criticality level '${hostAssetCriticalityRecord.criticality_level}' at ${login['@timestamp']}`,
          timestamp: login['@timestamp'],
          ingested: login.event.ingested,
          raw_event: login,
        },
      ],
    };
  }
};

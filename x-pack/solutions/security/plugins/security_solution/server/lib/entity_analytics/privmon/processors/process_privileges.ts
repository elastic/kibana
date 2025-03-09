/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import pmap from 'p-map';
import {
  OBSERVATION_TYPES,
  isSuccessfulGroupAddDoc,
} from '../../../../../common/entity_analytics/privmon';
import type { AssetCriticalityRecord } from '../../../../../common/entity_analytics/asset_criticality/types';
import type {
  PrivmonPrivilegeDoc,
  PrivilegedUserDoc,
} from '../../../../../common/api/entity_analytics/privmon';
import type { AssetCriticalityService } from '../../asset_criticality';
import type { PrivmonDataClient } from '../privmon_data_client';
import type { ProcessorResult, UserAndObservations } from './types';
import { mergeObservationsByUser } from './utils';

const MAX_CONCURRENCY = 10;

const PRIVILEGED_GROUPS = ['admin', 'root', 'wheel', 'administrators', 'domain admins'];

const groupContainsReferenceToAdmin = (group: string): boolean => {
  const adminRegex = /admin|administrator/i; // group conatins admin or adminstrator
  return adminRegex.test(group);
};

const isPrivilegedGroup = (group: string): boolean =>
  PRIVILEGED_GROUPS.includes(group.toLowerCase()) || groupContainsReferenceToAdmin(group);

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
  hostAssetCriticalityRecord,
  esClient,
  logger,
  privmonDataClient,
}: {
  privilege: PrivmonPrivilegeDoc;
  hostAssetCriticalityRecord?: AssetCriticalityRecord;
  esClient: ElasticsearchClient;
  logger: Logger;
  privmonDataClient: PrivmonDataClient;
}): Promise<ProcessorResult> => {
  const usersAndObservations = await getUsersAndObservations({
    privilege,
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
      privilegeDocToPrivilegedUser(privilege, userAndObservations)
    ),
  };
};

const privilegeDocToPrivilegedUser = (
  privilege: PrivmonPrivilegeDoc,
  { observations, user }: UserAndObservations
): PrivilegedUserDoc => {
  return {
    user,
    active: true,
    '@timestamp': privilege['@timestamp'],
    created_at: new Date().toISOString(),
    observations,
  };
};

const getUsersAndObservations = async ({
  privilege,
  hostAssetCriticalityRecord,
  logger,
  privmonDataClient,
}: {
  privilege: PrivmonPrivilegeDoc;
  hostAssetCriticalityRecord?: AssetCriticalityRecord;
  logger: Logger;
  privmonDataClient: PrivmonDataClient;
}): Promise<UserAndObservations[]> => {
  const observations = [
    ...userAddedToPrivilegedGroupObservation({ privilege, hostAssetCriticalityRecord }),
    ...userControlsPrivilegedGroupObservation({ privilege, hostAssetCriticalityRecord }),
  ].flat();

  return observations;
};

const userAddedToPrivilegedGroupObservation = ({
  privilege,
  hostAssetCriticalityRecord,
}: {
  privilege: PrivmonPrivilegeDoc;
  hostAssetCriticalityRecord?: AssetCriticalityRecord;
}): UserAndObservations[] => {
  if (!isSuccessfulGroupAddDoc(privilege)) {
    return [];
  }

  const group = privilege.group?.name;

  if (!group || !isPrivilegedGroup(group)) {
    return [];
  }

  const privilegedUserObservation: UserAndObservations = {
    user: privilege.target.user,
    observations: [
      {
        observation_type: OBSERVATION_TYPES.PRIVILEGE.ADDED_TO_PRIVILEGED_GROUP,
        summary: `User added to privileged group: ${group}`,
        raw_event: privilege,
        timestamp: privilege['@timestamp'],
        ingested: privilege.event.ingested,
      },
    ],
  };

  return [privilegedUserObservation];
};

const userControlsPrivilegedGroupObservation = ({
  privilege,
  hostAssetCriticalityRecord,
}: {
  privilege: PrivmonPrivilegeDoc;
  hostAssetCriticalityRecord?: AssetCriticalityRecord;
}): UserAndObservations[] => {
  if (!isSuccessfulGroupAddDoc(privilege)) {
    return [];
  }

  const group = privilege.group?.name;

  if (!group || !isPrivilegedGroup(group)) {
    return [];
  }

  const controlsPrivilegedGroupObservation: UserAndObservations = {
    user: privilege.user,
    observations: [
      {
        observation_type: OBSERVATION_TYPES.PRIVILEGE.CONTROLS_PRIVILEGED_GROUP,
        summary: `User added user ${privilege.target.user.name} to privileged group: ${group}`,
        raw_event: privilege,
        timestamp: privilege['@timestamp'],
        ingested: privilege.event.ingested,
      },
    ],
  };

  return [controlsPrivilegedGroupObservation];
};

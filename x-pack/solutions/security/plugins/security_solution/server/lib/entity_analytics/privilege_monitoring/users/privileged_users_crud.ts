/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { UpdatePrivMonUserRequestBody } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/update.gen';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import type {
  CreatePrivMonUserRequestBody,
  CreatePrivMonUserResponse,
} from '../../../../../common/api/entity_analytics/privilege_monitoring/users/create.gen';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import type { PrivMonUserSource } from '../types';
import {
  findUserByUsername,
  isUserLimitReached,
  createUserDocument,
  updateUserWithSource,
} from './utils';

export const createPrivilegedUsersCrudService = ({
  deps,
  index,
}: PrivilegeMonitoringDataClient) => {
  const esClient = deps.clusterClient.asCurrentUser;

  const create = async (
    userInput: CreatePrivMonUserRequestBody,
    source: PrivMonUserSource,
    maxPrivilegedUsersAllowed: number,
    opts?: {
      refresh?: boolean;
    }
  ): Promise<CreatePrivMonUserResponse> => {
    const username = userInput.user?.name;

    if (!username) {
      throw new Error('Username is required');
    }

    // Check if user already exists
    const existingUser = await findUserByUsername(esClient, index, username);

    if (existingUser) {
      // User exists, update with new source
      return updateUserWithSource(esClient, index, existingUser, source, userInput, get);
    }

    // Check user limit before creating new user
    const limitReached = await isUserLimitReached(esClient, index, maxPrivilegedUsersAllowed);

    if (limitReached) {
      throw new Error(
        `Cannot add user: maximum limit of ${maxPrivilegedUsersAllowed} privileged users reached`
      );
    }

    // Create new user document
    return createUserDocument(esClient, index, userInput, source, get);
  };

  const get = async (id: string): Promise<MonitoredUserDoc | undefined> => {
    const response = await esClient.get<MonitoredUserDoc>({ index, id });
    return response.found
      ? ({ ...response._source, id: response._id } as MonitoredUserDoc)
      : undefined;
  };

  const update = async (
    id: string,
    user: UpdatePrivMonUserRequestBody
  ): Promise<MonitoredUserDoc | undefined> => {
    await esClient.update<MonitoredUserDoc>({
      index,
      refresh: 'wait_for',
      id,
      doc: user,
    });
    return get(id);
  };

  const list = async (kuery?: string): Promise<MonitoredUserDoc[]> => {
    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };
    const response = await esClient.search({
      size: 10000,
      index,
      query,
    });
    return response.hits.hits.map((hit) => ({
      id: hit._id,
      ...(hit._source as {}),
    })) satisfies MonitoredUserDoc[];
  };

  const _delete = async (id: string): Promise<void> => {
    await esClient.delete({ index, id });
  };

  return { create, get, update, list, delete: _delete };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import type {
  CreatePrivMonUserRequestBody,
  CreatePrivMonUserResponse,
} from '../../../../../common/api/entity_analytics/privilege_monitoring/users/create.gen';
import type { PrivMonUserSource } from '../types';

/**
 * Helper function: Find existing user by username
 */
export const findUserByUsername = async (
  esClient: ElasticsearchClient,
  index: string,
  username: string
): Promise<MonitoredUserDoc | undefined> => {
  const response = await esClient.search({
    index,
    query: {
      term: {
        'user.name': username,
      },
    },
    size: 1,
  });

  if (response.hits.hits.length === 0) {
    return undefined;
  }

  const hit = response.hits.hits[0];
  return {
    id: hit._id,
    ...(hit._source as Omit<MonitoredUserDoc, 'id'>),
  } as MonitoredUserDoc;
};

/**
 * Helper function: Check if user count limit is reached
 */
export const isUserLimitReached = async (
  esClient: ElasticsearchClient,
  index: string,
  maxUsersAllowed: number
): Promise<boolean> => {
  const currentUserCount = await esClient.count({
    index,
    query: {
      term: {
        'user.is_privileged': true,
      },
    },
  });

  return currentUserCount.count >= maxUsersAllowed;
};

/**
 * Helper function: Merge sources without duplicates
 */
export const mergeSources = (
  existingSources: PrivMonUserSource[],
  newSource: PrivMonUserSource
): PrivMonUserSource[] => {
  const sources = existingSources || [];
  return sources.includes(newSource) ? sources : [...sources, newSource];
};

/**
 * Helper function: Create new user document
 */
export const createUserDocument = async (
  esClient: ElasticsearchClient,
  index: string,
  user: CreatePrivMonUserRequestBody,
  source: PrivMonUserSource,
  getUser: (id: string) => Promise<MonitoredUserDoc | undefined>
): Promise<CreatePrivMonUserResponse> => {
  const doc = merge(user, {
    user: {
      is_privileged: true,
    },
    labels: {
      sources: [source],
    },
    '@timestamp': new Date().toISOString(),
  });

  const res = await esClient.index({
    index,
    refresh: 'wait_for',
    document: doc,
  });

  const newUser = await getUser(res._id);
  if (!newUser) {
    throw new Error(`Failed to create user: ${res._id}`);
  }
  return newUser;
};

/**
 * Helper function: Update existing user with new source
 */
export const updateUserWithSource = async (
  esClient: ElasticsearchClient,
  index: string,
  existingUser: MonitoredUserDoc,
  source: PrivMonUserSource,
  user: CreatePrivMonUserRequestBody,
  getUser: (id: string) => Promise<MonitoredUserDoc | undefined>
): Promise<CreatePrivMonUserResponse> => {
  const existingSources = (existingUser.labels?.sources as PrivMonUserSource[]) || [];
  const updatedSources = mergeSources(existingSources, source);

  const updatedDoc = merge(existingUser, user, {
    user: {
      is_privileged: true,
    },
    labels: {
      sources: updatedSources,
    },
  });

  if (!existingUser.id) {
    throw new Error('Existing user must have an ID to update');
  }

  await esClient.update({
    index,
    id: existingUser.id,
    refresh: 'wait_for',
    doc: updatedDoc,
  });

  const updatedUser = await getUser(existingUser.id);
  if (!updatedUser) {
    throw new Error(`Failed to update user: ${existingUser.id}`);
  }
  return updatedUser;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { difference, union } from 'lodash';
import { SecurityService } from '@kbn/test-suites-src/common/services/security/security';
import { Elasticsearch, Kibana } from '..';
import { callKibana, isAxiosError } from './call_kibana';

interface User {
  username: string;
  roles: string[];
  full_name?: string;
  email?: string;
  enabled?: boolean;
}

export async function createOrUpdateUser({
  elasticsearch,
  kibana,
  user,
  securityService,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  user: User;
  securityService: SecurityService;
}) {
  const existingUser = await getUser({
    elasticsearch,
    kibana,
    username: user.username,
  });
  if (!existingUser) {
    createUser({ elasticsearch, newUser: user, securityService });
    return;
  }

  updateUser({
    existingUser,
    newUser: user,
    securityService,
  });
}

async function createUser({
  elasticsearch,
  newUser,
  securityService,
}: {
  elasticsearch: Elasticsearch;
  newUser: User;
  securityService: SecurityService;
}) {
  const { username, ...options } = newUser;
  await securityService.user.create(username, {
    ...options,
    enabled: true,
    password: elasticsearch.password,
  });
}

async function updateUser({
  existingUser,
  newUser,
  securityService,
}: {
  existingUser: User;
  newUser: User;
  securityService: SecurityService;
}) {
  const { username } = newUser;
  const allRoles = union(existingUser.roles, newUser.roles);
  const hasAllRoles = difference(allRoles, existingUser.roles).length === 0;
  if (hasAllRoles) {
    console.log(`Skipping: User "${username}" already has necessary roles: "${newUser.roles}"`);
    return;
  }

  const { username: _, ...options } = existingUser;
  await securityService.user.create(username, { ...options, roles: allRoles });
}

async function getUser({
  elasticsearch,
  kibana,
  username,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  username: string;
}) {
  try {
    return await callKibana<User>({
      elasticsearch,
      kibana,
      options: {
        url: `/internal/security/users/${username}`,
      },
    });
  } catch (e) {
    // return empty if user doesn't exist
    if (isAxiosError(e) && e.response?.status === 404) {
      return null;
    }

    throw e;
  }
}

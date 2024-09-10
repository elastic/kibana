/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { asyncForEach } from '@kbn/std';
import type { SecurityService } from '@kbn/ftr-common-functional-ui-services';
import { ProfilingUsername, profilingUsers } from './authentication';
import { AbortError, callKibana } from './helpers/call_kibana';
import { createOrUpdateUser } from './helpers/create_or_update_user';

export interface Elasticsearch {
  node: string;
  username: string;
  password: string;
}

export interface Kibana {
  hostname: string;
}

export async function createProfilingUsers({
  kibana,
  elasticsearch,
  securityService,
}: {
  kibana: Kibana;
  elasticsearch: Elasticsearch;
  securityService: SecurityService;
}) {
  const isCredentialsValid = await getIsCredentialsValid({
    elasticsearch,
    kibana,
  });

  if (!isCredentialsValid) {
    throw new AbortError('Invalid username/password');
  }

  const isSecurityEnabled = await getIsSecurityEnabled({
    elasticsearch,
    kibana,
  });

  if (!isSecurityEnabled) {
    throw new AbortError('Security must be enabled!');
  }

  const userNames = Object.values(ProfilingUsername);
  await asyncForEach(userNames, async (username) => {
    const user = profilingUsers[username];
    const { builtInRoleNames = [] } = user;

    // create user
    await createOrUpdateUser({
      securityService,
      elasticsearch,
      kibana,
      user: { username, roles: builtInRoleNames },
    });
  });

  return userNames;
}

async function getIsSecurityEnabled({
  elasticsearch,
  kibana,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
}) {
  try {
    await callKibana({
      elasticsearch,
      kibana,
      options: {
        url: `/internal/security/me`,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function getIsCredentialsValid({
  elasticsearch,
  kibana,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
}) {
  try {
    await callKibana({
      elasticsearch,
      kibana,
      options: {
        validateStatus: (status) => status >= 200 && status < 400,
        url: `/`,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
}

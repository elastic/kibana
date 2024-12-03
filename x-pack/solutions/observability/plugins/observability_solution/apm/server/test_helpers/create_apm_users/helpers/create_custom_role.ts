/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { omit } from 'lodash';
import { Elasticsearch, Kibana } from '../create_apm_users';
import { callKibana } from './call_kibana';
import { customRoles, ApmCustomRolename } from '../authentication';

export async function createCustomRole({
  elasticsearch,
  kibana,
  roleName,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  roleName: ApmCustomRolename;
}) {
  const role = customRoles[roleName];

  // Add application privileges with es client as they are not supported by
  // the security API. They are preserved when updating the role below
  if ('applications' in role) {
    const esClient = getEsClient(elasticsearch);
    await esClient.security.putRole({ name: roleName, body: role });
  }

  await callKibana({
    elasticsearch,
    kibana,
    options: {
      method: 'PUT',
      url: `/api/security/role/${roleName}`,
      data: {
        ...omit(role, 'applications'),
      },
    },
  });
}

export function getEsClient(elasticsearch: Elasticsearch) {
  const { node, username, password } = elasticsearch;
  const client = new Client({
    node,
    tls: {
      rejectUnauthorized: false,
    },
    requestTimeout: 120000,
    auth: {
      username,
      password,
    },
  });

  return client;
}

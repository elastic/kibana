/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith, uniq } from 'lodash';
import { Client } from '@elastic/elasticsearch';
import {
  apiKeyCreationPrivileges,
  entityDefinitionDeletionPrivileges,
  entityDefinitionRuntimePrivileges,
} from '@kbn/entityManager-plugin/server/lib/auth/privileges';
import { BUILT_IN_ALLOWED_INDICES } from '@kbn/entityManager-plugin/server/lib/entities/built_in/constants';

export const createAdmin = async ({
  esClient,
  username = 'entities_admin',
  password = 'changeme',
}: {
  esClient: Client;
  username?: string;
  password?: string;
}) => {
  const privileges = mergeWith(
    { application: [], index: [], cluster: [] },
    apiKeyCreationPrivileges,
    entityDefinitionRuntimePrivileges(BUILT_IN_ALLOWED_INDICES),
    entityDefinitionDeletionPrivileges,
    (src, other) => uniq(src.concat(other))
  );
  const role = 'entities_all';

  await esClient.security.putRole({
    name: role,
    applications: privileges.application,
    cluster: privileges.cluster,
    indices: privileges.index,
  });
  await esClient.security.putUser({ username, password, roles: [role] });

  return { username, password };
};

export const createRuntimeUser = async ({
  esClient,
  username = 'entities_runtime_user',
  password = 'changeme',
}: {
  esClient: Client;
  username?: string;
  password?: string;
}) => {
  const privileges = entityDefinitionRuntimePrivileges(BUILT_IN_ALLOWED_INDICES);
  const role = 'entities_runtime';

  await esClient.security.putRole({
    name: role,
    applications: privileges.application,
    cluster: privileges.cluster,
    indices: privileges.index,
  });
  await esClient.security.putUser({ username, password, roles: [role] });

  return { username, password };
};

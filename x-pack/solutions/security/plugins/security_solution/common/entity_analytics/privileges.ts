/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsPrivileges } from '../api/entity_analytics';

export const getAllMissingPrivileges = (privilege: EntityAnalyticsPrivileges) => {
  const esPrivileges = privilege.privileges.elasticsearch;
  const kbnPrivileges = privilege.privileges.kibana;

  const index = Object.entries(esPrivileges.index ?? {})
    .map(([indexName, indexPrivileges]) => ({
      indexName,
      privileges: filterUnauthorized(indexPrivileges),
    }))
    .filter(({ privileges }) => privileges.length > 0);

  return {
    elasticsearch: { index, cluster: filterUnauthorized(esPrivileges.cluster) },
    kibana: filterUnauthorized(kbnPrivileges),
  };
};

const filterUnauthorized = (obj: Record<string, boolean> | undefined) =>
  Object.entries(obj ?? {})
    .filter(([_, authorized]) => !authorized)
    .map(([privileges, _]) => privileges);

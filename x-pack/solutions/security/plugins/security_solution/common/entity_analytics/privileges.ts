/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsPrivileges } from '../api/entity_analytics';

export interface MissingPrivileges {
  elasticsearch: {
    index: Array<{ indexName: string; privileges: string[] }>;
    cluster: string[];
  };
  kibana: string[];
}

export const getAllMissingPrivileges = (
  privilege: EntityAnalyticsPrivileges
): MissingPrivileges => {
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

export const getMissingPrivilegesErrorMessage = ({ elasticsearch, kibana }: MissingPrivileges) =>
  [
    ...elasticsearch.index.map(
      ({ indexName, privileges }) =>
        `Missing [${privileges.join(', ')}] privileges for index '${indexName}'.`
    ),

    ...(elasticsearch.cluster.length > 0
      ? [`Missing [${elasticsearch.cluster.join(', ')}] cluster privileges.`]
      : []),

    ...(kibana.length > 0 ? [`Missing [${kibana.join(', ')}] Kibana privileges.`] : []),
  ].join('\n');

const filterUnauthorized = (obj: Record<string, boolean> | undefined) =>
  Object.entries(obj ?? {})
    .filter(([_, authorized]) => !authorized)
    .map(([privileges, _]) => privileges);

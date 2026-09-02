/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

// Safety cap — limits the IN list size passed to the alerts query.
export const HC_ENTITY_LIMIT = 10_000;

export const buildHcEntityIdentityQuery = (entityLatestIndex: string): string =>
  [
    `FROM ${entityLatestIndex}`,
    `| WHERE entity.risk.calculated_level IN ("High", "Critical")`,
    `| KEEP entity.EngineMetadata.Type, user.name, host.name, service.name`,
    `| LIMIT ${HC_ENTITY_LIMIT}`,
  ].join('\n');

export interface HcEntityIdentities {
  userNames: string[];
  hostNames: string[];
  serviceNames: string[];
}

export const parseHcEntityIdentities = (rawResponse: ESQLSearchResponse): HcEntityIdentities => {
  const columns = rawResponse.columns ?? [];
  const rows = rawResponse.values ?? [];

  const colIdx = (name: string) => columns.findIndex((c) => c.name === name);
  const typeCol = colIdx('entity.EngineMetadata.Type');
  const userCol = colIdx('user.name');
  const hostCol = colIdx('host.name');
  const serviceCol = colIdx('service.name');

  const userNames = new Set<string>();
  const hostNames = new Set<string>();
  const serviceNames = new Set<string>();

  for (const row of rows) {
    const type = (row[typeCol] as string | null) ?? '';
    const userName = row[userCol] as string | null;
    const hostName = row[hostCol] as string | null;
    const serviceName = row[serviceCol] as string | null;

    if (type === 'user' && userName) userNames.add(userName);
    else if (type === 'host' && hostName) hostNames.add(hostName);
    else if (type === 'service' && serviceName) serviceNames.add(serviceName);
  }

  return {
    userNames: [...userNames],
    hostNames: [...hostNames],
    serviceNames: [...serviceNames],
  };
};

export const hasAnyIdentities = (identities: HcEntityIdentities): boolean =>
  identities.userNames.length > 0 ||
  identities.hostNames.length > 0 ||
  identities.serviceNames.length > 0;

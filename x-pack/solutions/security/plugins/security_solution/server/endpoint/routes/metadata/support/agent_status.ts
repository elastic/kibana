/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentStatusKueryHelper } from '@kbn/fleet-plugin/common/services';
import { HostStatus } from '../../../../../common/endpoint/types';

const STATUS_QUERY_MAP = new Map([
  [HostStatus.HEALTHY.toString(), AgentStatusKueryHelper.buildKueryForOnlineAgents()],
  [HostStatus.OFFLINE.toString(), AgentStatusKueryHelper.buildKueryForOfflineAgents()],
  [HostStatus.UNHEALTHY.toString(), AgentStatusKueryHelper.buildKueryForErrorAgents()],
  [HostStatus.UPDATING.toString(), AgentStatusKueryHelper.buildKueryForUpdatingAgents()],
  [HostStatus.INACTIVE.toString(), AgentStatusKueryHelper.buildKueryForInactiveAgents()],
  [HostStatus.UNENROLLED.toString(), AgentStatusKueryHelper.buildKueryForUnenrolledAgents()],
]);

export function buildStatusesKuery(statusesToFilter: string[]): string | undefined {
  if (!statusesToFilter.length) {
    return;
  }
  const statusQueries = statusesToFilter.map((status) => STATUS_QUERY_MAP.get(status));
  if (!statusQueries.length) {
    return;
  }

  return `(${statusQueries.join(' OR ')})`;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MonitorOrigin } from '../runtime_types';

/**
 * Ping identity for a monitor details / errors query.
 *
 * Kibana-managed monitors (UI, project, and CCS remote) stamp `config_id` on
 * every ping, and the details URL is that saved-object id. Heartbeat / Elastic
 * Agent autodiscovery pings have no saved object and no `config_id` — the URL
 * and ping identity are both `monitor.id`. Matching `config_id` for those
 * would return zero hits.
 */
export const getMonitorIdentityFilter = ({
  monitorId,
  origin,
  remoteName,
}: {
  monitorId: string;
  origin?: MonitorOrigin;
  remoteName?: string;
}): QueryDslQueryContainer => {
  if (origin === 'heartbeat' && !remoteName) {
    return { term: { 'monitor.id': monitorId } };
  }
  return { term: { config_id: monitorId } };
};

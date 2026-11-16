/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsIndex } from '../../esql';
import {
  DATE,
  EUID_SOURCE_FIELDS,
  HOUR_MS,
  KEYWORD,
  NAMESPACE,
  keywordsOf,
  toIsoAgo,
} from './fixture_index';
import type { FixtureIndex } from './fixture_index';

interface AlertSeed {
  entityId: string;
  /** Leaves `kibana.alert.entity.id` unset, so the EUID comes from `host.id`. */
  hostId?: string;
  /** Names a user by `user.id` with `event.module`, so its EUID is `user:<userId>@<module>`. */
  userId?: string;
  eventModule?: string;
  outcome?: 'success' | 'failure';
  /** Another id the alert is stamped with, which makes `kibana.alert.entity.id` multi-value. */
  otherEntityId?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  hoursAgo: number;
  status?: 'open' | 'closed';
}

const ALERTS: readonly AlertSeed[] = [
  { entityId: 'host:h1', severity: 'critical', hoursAgo: 3 },
  { entityId: 'host:h1', otherEntityId: 'user:dave@okta', severity: 'high', hoursAgo: 5 },
  { entityId: 'host:h1', severity: 'high', hoursAgo: 7 },
  { entityId: 'host:h2', hostId: 'h2', severity: 'low', hoursAgo: 1 },
  // Alerts of the aliases of host:h1, one stamped and one by its host id.
  { entityId: 'host:h4', severity: 'critical', hoursAgo: 0.5 },
  { entityId: 'host:h5', hostId: 'h5', severity: 'low', hoursAgo: 9 },
  { entityId: 'user:alice@okta', severity: 'medium', hoursAgo: 2 },
  { entityId: 'user:alice@okta', severity: 'medium', hoursAgo: 4 },
  // A failed login, unstamped: it names host:h1 by `host.id` and user:bob@okta by `user.id`, but
  // the user's `documentsFilter` excludes failed outcomes, so only the host counts the alert.
  {
    entityId: 'host:h1',
    hostId: 'h1',
    userId: 'bob',
    eventModule: 'okta',
    outcome: 'failure',
    severity: 'medium',
    hoursAgo: 8,
  },
  { entityId: 'host:h3', severity: 'high', hoursAgo: 6, status: 'closed' },
  { entityId: 'host:h3', severity: 'high', hoursAgo: 40 * 24 },
];

const toAlertDoc = (
  {
    entityId,
    hostId,
    userId,
    eventModule,
    outcome,
    otherEntityId,
    severity,
    hoursAgo,
    status = 'open',
  }: AlertSeed,
  now: number
) => ({
  '@timestamp': toIsoAgo(now, hoursAgo * HOUR_MS),
  ...(hostId
    ? { 'host.id': hostId }
    : { 'kibana.alert.entity.id': otherEntityId ? [entityId, otherEntityId] : entityId }),
  ...(userId ? { 'user.id': userId } : {}),
  ...(eventModule ? { 'event.module': eventModule } : {}),
  ...(outcome ? { 'event.outcome': outcome } : {}),
  'kibana.alert.severity': severity,
  'kibana.alert.workflow_status': status,
});

export const alertsIndex: FixtureIndex = {
  index: getAlertsIndex(NAMESPACE),
  fields: {
    ...keywordsOf(EUID_SOURCE_FIELDS),
    '@timestamp': DATE,
    'event.outcome': KEYWORD,
    'kibana.alert.entity.id': KEYWORD,
    'kibana.alert.severity': KEYWORD,
    'kibana.alert.workflow_status': KEYWORD,
  },
  buildDocs: (now) => ALERTS.map((seed) => toAlertDoc(seed, now)),
};

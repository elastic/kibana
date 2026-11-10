/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { hasIngestPrivileges } from './has_ingest_privileges';
import { hasLogMonitoringPrivileges } from './has_log_monitoring_privileges';
import {
  APM_EVENT_WRITE_APPLICATION,
  INDEX_LOGS_AND_METRICS,
  INDEX_LOGS_METRICS_AND_TRACES,
  INDEX_OTLP_LOGS_METRICS_AND_TRACES,
  INDEX_PROMETHEUS_REMOTE_WRITE,
  MONITOR_CLUSTER,
} from './privileges';

interface GrantedPrivileges {
  cluster?: string[];
  index?: estypes.SecurityIndicesPrivileges[];
  application?: estypes.SecurityApplicationPrivileges[];
}

const coversIndices = (
  granted: estypes.SecurityIndicesPrivileges,
  requested: estypes.SecurityIndicesPrivileges
): boolean =>
  [requested.names].flat().every((name) => [granted.names].flat().includes(name)) &&
  [requested.privileges].flat().every((privilege) => granted.privileges.includes(privilege));

// Answers like Elasticsearch would for a user holding exactly the granted privileges, except that
// index names are compared literally instead of as patterns.
const createEsClientForUser = ({ cluster = [], index = [], application = [] }: GrantedPrivileges) =>
  ({
    security: {
      hasPrivileges: jest.fn(async (request: estypes.SecurityHasPrivilegesRequest) => ({
        has_all_requested:
          (request.cluster ?? []).every((privilege) => cluster.includes(privilege)) &&
          (request.index ?? []).every((requested) =>
            index.some((granted) => coversIndices(granted, requested))
          ) &&
          (request.application ?? []).every((privileges) => application.includes(privileges)),
      })),
    },
  } as unknown as ElasticsearchClient);

describe('hasIngestPrivileges', () => {
  it.each<[string, GrantedPrivileges]>([
    ['logs and metrics indices', { index: [INDEX_LOGS_AND_METRICS] }],
    ['logs, metrics and traces indices', { index: [INDEX_LOGS_METRICS_AND_TRACES] }],
    ['OTLP indices', { index: [INDEX_OTLP_LOGS_METRICS_AND_TRACES] }],
    ['Prometheus indices', { index: [INDEX_PROMETHEUS_REMOTE_WRITE] }],
    ['the APM application', { application: [APM_EVENT_WRITE_APPLICATION] }],
  ])('grants a user who can write to %s, even without API key privileges', async (_, granted) => {
    expect(await hasIngestPrivileges(createEsClientForUser(granted))).toBe(true);
  });

  it('grants every user who passes the host onboarding check', async () => {
    const esClient = createEsClientForUser({
      cluster: [MONITOR_CLUSTER, 'manage_own_api_key'],
      index: [INDEX_LOGS_AND_METRICS],
    });

    expect(await hasLogMonitoringPrivileges(esClient)).toBe(true);
    expect(await hasIngestPrivileges(esClient)).toBe(true);
  });

  it('denies a user who cannot write data through any endpoint', async () => {
    const esClient = createEsClientForUser({ cluster: [MONITOR_CLUSTER, 'manage_own_api_key'] });

    expect(await hasIngestPrivileges(esClient)).toBe(false);
  });
});

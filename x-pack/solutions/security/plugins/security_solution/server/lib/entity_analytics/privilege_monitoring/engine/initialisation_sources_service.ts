/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationType } from '../../../../../common/entity_analytics/privilege_monitoring/constants';
import {
  INTEGRATION_TYPES,
  defaultMonitoringUsersIndex,
  getMatchersFor,
  getStreamPatternFor,
  integrationsSourceIndex,
} from '../../../../../common/entity_analytics/privilege_monitoring/constants';
import type { MonitoringEntitySourceDescriptorClient } from '../saved_objects/monitoring_entity_source';
import type { PrivilegeMonitoringDataClient } from './data_client';

export type InitialisationSourcesService = ReturnType<typeof createInitialisationSourcesService>;

export const createInitialisationSourcesService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps } = dataClient;
  const makeDefaultIndexSource = (namespace: string, name: string) => ({
    type: 'index' as const,
    managed: true,
    indexPattern: defaultMonitoringUsersIndex(namespace),
    name,
  });

  const makeIntegrationSource = (namespace: string, integration: IntegrationType) => ({
    type: 'entity_analytics_integration' as const,
    managed: true,
    indexPattern: getStreamPatternFor(integration, namespace),
    name: integrationsSourceIndex(namespace, integration),
    matchers: getMatchersFor(integration),
  });

  function buildRequiredSources(namespace: string, indexPattern: string) {
    const integrations = INTEGRATION_TYPES.map((integration) =>
      makeIntegrationSource(namespace, integration)
    );
    return [makeDefaultIndexSource(namespace, indexPattern), ...integrations];
  }

  async function upsertSources(client: MonitoringEntitySourceDescriptorClient) {
    // required sources to initialize privileged monitoring engine
    const requiredInitSources = buildRequiredSources(deps.namespace, dataClient.index);
    const existing = await client.findAll({});
    // create all sources, if none exist already
    if (existing.length === 0) {
      await Promise.all(requiredInitSources.map((attrs) => client.create(attrs)));
      dataClient.log('debug', `Created all ${requiredInitSources.length} default sources`);
      return;
    }
    // map existing by name for easy lookup
    const soNameMap = new Map(existing.map((so) => [so.name, so]));
    let created = 0;
    let updated = 0;
    // update or create sources based on existing sources
    await Promise.all(
      requiredInitSources.map(async (attrs) => {
        const found = soNameMap.get(attrs.name);
        if (!found) {
          await client.create(attrs);
          dataClient.log('debug', `Created source: ${attrs.name}`);
          created++;
        } else {
          await client.update({ id: found.id, ...attrs });
          dataClient.log('debug', `Updated source: ${attrs.name}`);
          updated++;
        }
      })
    );
    dataClient.log(
      'debug',
      `Privilege Monitoring sources upsert - created: ${created}, updated: ${updated}, processed: ${requiredInitSources.length}.`
    );
  }
  return { upsertSources };
};

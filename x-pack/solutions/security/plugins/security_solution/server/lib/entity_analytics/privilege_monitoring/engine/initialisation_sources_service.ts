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

  async function upsertSources(client: MonitoringEntitySourceDescriptorClient) {
    // required sources to initialize privileged monitoring engine
    const requiredInitSources = [
      ...(dataClient.index ? [makeDefaultIndexSource(deps.namespace, dataClient.index)] : []), // default index source
      ...INTEGRATION_TYPES.map((i) => makeIntegrationSource(deps.namespace, i)), // integration sources
    ];
    // get already existing/ managed sources
    const existing = await client.findAll({});
    if (!existing) {
      // just create all, no point doing extra logic otherwise.
      await Promise.all(requiredInitSources.map((attrs) => client.create(attrs)));
      dataClient.log('debug', `Created all default sources`);
    } else {
      const soNameMap = new Map(existing.map((so) => [so.name, so]));
      // update or create sources based on existing sources
      await Promise.all(
        requiredInitSources.map(async (attrs) => {
          const source = soNameMap.get(attrs.name);
          // if source exists, update it (in case attrs changed), else create a new one
          if (source) {
            const res = await client.update({ id: source.id, ...attrs });
            dataClient.log('debug', `Updated source '${attrs.name}' (id: ${source.id})`);
            return res;
          } else {
            const res = await client.create(attrs);
            dataClient.log('debug', `Created new source '${attrs.name}'`);
            return res;
          }
        })
      );
    }
  }
  return { upsertSources };
};

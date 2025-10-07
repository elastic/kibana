/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultMonitoringUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { MonitoringEntitySourceDescriptorClient } from '../saved_objects/monitoring_entity_source';
import { MonitoringEngineComponentResourceEnum } from '../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from './data_client';
import type { IntegrationType } from '../data_sources';
import {
  getMatchersFor,
  getStreamPatternFor,
  INTEGRATION_TYPES,
  integrationsSourceIndex,
  oktaLastFullSyncMarkersIndex,
} from '../data_sources';
import { PrivilegeMonitoringEngineActions } from '../auditing/actions';

export type InitialisationSourcesService = ReturnType<typeof createInitialisationSourcesService>;

export const createInitialisationSourcesService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps } = dataClient;
  const makeDefaultIndexSource = (namespace: string, name: string) => ({
    type: 'index' as const,
    managed: true,
    indexPattern: defaultMonitoringUsersIndex(namespace),
    name,
  });

  const getLastFullSyncMarkersIndex = (namespace: string, integration: IntegrationType) => {
    // When using AD, will use the users index: TODO in: https://github.com/elastic/security-team/issues/13990
    /* if (integration === 'ad') {
      return getStreamPatternFor(integration, namespace);
    }*/
    // okta has a dedicated index for last full sync markers
    return oktaLastFullSyncMarkersIndex(namespace);
  };

  const makeIntegrationSource = (namespace: string, integration: IntegrationType) => ({
    type: 'entity_analytics_integration' as const,
    managed: true,
    indexPattern: getStreamPatternFor(integration, namespace),
    name: integrationsSourceIndex(namespace, integration),
    matchers: getMatchersFor(integration),
    integrationName: integration,
    integrations: { syncMarkerIndex: getLastFullSyncMarkersIndex(namespace, integration) },
  });

  function buildRequiredSources(namespace: string, indexPattern: string) {
    const integrations = INTEGRATION_TYPES.map((integration) =>
      makeIntegrationSource(namespace, integration)
    );
    return [makeDefaultIndexSource(namespace, indexPattern), ...integrations];
  }

  async function upsertSources(client: MonitoringEntitySourceDescriptorClient) {
    try {
      // required sources to initialize privileged monitoring engine
      const requiredInitSources = buildRequiredSources(deps.namespace, dataClient.index);
      const existing = await client.findAll({});
      // create all sources, if none exist already
      if (existing.length === 0) {
        await client.bulkCreate(requiredInitSources);
        dataClient.log('debug', `Created all ${requiredInitSources.length} default sources`);
        return;
      }
      const { created, updated, results } = await client.bulkUpsert(requiredInitSources);
      dataClient.log(
        'debug',
        `Privilege Monitoring sources upsert - created: ${created}, updated: ${updated}, processed: ${results.length}.`
      );
    } catch (error) {
      dataClient.log(
        'error',
        `Failed to create default index source for privilege monitoring: ${error.message}`
      );
      dataClient.audit(
        PrivilegeMonitoringEngineActions.INIT,
        MonitoringEngineComponentResourceEnum.privmon_engine,
        'Failed to create default index source for privilege monitoring',
        error
      );
    }
  }
  return { upsertSources };
};

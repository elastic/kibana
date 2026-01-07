/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger, Logger } from '@kbn/core/server';
import { isEqual } from 'lodash';
import {
  defaultMonitoringUsersIndex,
  getPrivilegedMonitorUsersIndex,
} from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { MonitoringEntitySourceDescriptorClient } from '../saved_objects/monitoring_entity_source';
import type { MonitoringEntitySourceType } from '../../../../../common/api/entity_analytics';
import { MonitoringEngineComponentResourceEnum } from '../../../../../common/api/entity_analytics';
import type { IntegrationType } from '../data_sources';
import {
  getMatchersFor,
  getStreamPatternFor,
  INTEGRATION_TYPES,
  integrationsSourceIndex,
  oktaLastFullSyncMarkersIndex,
} from '../data_sources';
import { PrivilegeMonitoringEngineActions } from '../auditing/actions';
import { monitoringEntitySourceTypeName } from '../saved_objects';
import { createPrivMonAuditLogger } from '../audit_logger';
import { createPrivMonLogger } from '../logger';

export type InitialisationSourcesService = ReturnType<typeof createInitialisationSourcesService>;

export const createInitialisationSourcesService = (deps: {
  descriptorClient: MonitoringEntitySourceDescriptorClient;
  logger: Logger;
  auditLogger?: AuditLogger;
}) => {
  return async function upsertSources(namespace: string) {
    const logger = createPrivMonLogger(deps.logger, namespace);
    const auditLogger = createPrivMonAuditLogger(deps.auditLogger);
    const index = getPrivilegedMonitorUsersIndex(namespace);

    try {
      // required sources to initialize privileged monitoring engine
      const requiredInitSources = buildRequiredSources(namespace, index);
      const { total: existingTotal } = await deps.descriptorClient.list({
        per_page: 1,
      });

      // create all sources, if none exist already
      if (existingTotal === 0) {
        await deps.descriptorClient.bulkCreate(requiredInitSources);
        logger.log('debug', `Created all ${requiredInitSources.length} default sources`);
        return;
      }
      const requiredIntegrationNames = requiredInitSources.map(({ name }) => name).sort();
      const { sources: installedIntegrations } = await deps.descriptorClient.listByKuery({
        kuery: buildFilterByIntegrationNames(requiredIntegrationNames),
        perPage: requiredIntegrationNames.length,
      });

      const installedIntegrationsNames = installedIntegrations.map(({ name }) => name).sort();

      if (!isEqual(requiredIntegrationNames, installedIntegrationsNames)) {
        const { created, updated, results } = await deps.descriptorClient.bulkUpsert(
          requiredInitSources
        );
        logger.log(
          'debug',
          `Privilege Monitoring sources upsert - created: ${created}, updated: ${updated}, processed: ${results.length}.`
        );
      }
    } catch (error) {
      logger.log(
        'error',
        `Failed to create default index source for privilege monitoring: ${error.message}`
      );
      auditLogger.log(
        PrivilegeMonitoringEngineActions.INIT,
        MonitoringEngineComponentResourceEnum.privmon_engine,
        'Failed to create default index source for privilege monitoring',
        error
      );
    }
  };
};

const getLastFullSyncMarkersIndex = (namespace: string, integration: IntegrationType) => {
  if (integration === 'entityanalytics_ad') {
    return getStreamPatternFor(integration, namespace);
  }
  // okta has a dedicated index for last full sync markers
  return oktaLastFullSyncMarkersIndex(namespace);
};

const makeIntegrationSource = (namespace: string, integration: IntegrationType) => ({
  type: 'entity_analytics_integration' as MonitoringEntitySourceType,
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

const makeDefaultIndexSource = (namespace: string, name: string) => ({
  type: 'index' as const,
  managed: true,
  indexPattern: defaultMonitoringUsersIndex(namespace),
  name,
});

const buildFilterByIntegrationNames = (requiredIntegrationNames: string[]): string => {
  return requiredIntegrationNames
    .map((name) => `${monitoringEntitySourceTypeName}.attributes.name: ${name}`)
    .join(' OR ');
};

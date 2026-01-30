/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger, Logger } from '@kbn/core/server';
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
      const requiredInitSources = buildRequiredSources(namespace, index, MANAGED_SOURCES_VERSION);
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

      const installedByName = new Map(installedIntegrations.map((source) => [source.name, source]));

      // If any source is missing or managed version outdated, upsert/migrate sources.
      const requiresUpsert = requiredInitSources.some((requiredSource) => {
        const existing = installedByName.get(requiredSource.name);
        return !existing || existing?.managedVersion !== requiredSource.managedVersion;
      });

      if (requiresUpsert) {
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

function buildRequiredSources(namespace: string, indexPattern: string, managedVersion: number) {
  const integrationsSources = INTEGRATION_TYPES.map((integration) =>
    buildIntegrationSource(namespace, integration, managedVersion)
  );
  const indexSource = buildDefaultIndexSource(namespace, indexPattern, managedVersion);
  return [indexSource, ...integrationsSources];
}

const buildDefaultIndexSource = (namespace: string, name: string, managedVersion: number) => ({
  type: 'index' as const,
  managed: true,
  managedVersion,
  indexPattern: defaultMonitoringUsersIndex(namespace),
  name,
});

const buildIntegrationSource = (
  namespace: string,
  integration: IntegrationType,
  managedVersion: number
) => ({
  type: 'entity_analytics_integration' as MonitoringEntitySourceType,
  managed: true,
  managedVersion,
  indexPattern: getStreamPatternFor(integration, namespace),
  name: integrationsSourceIndex(namespace, integration),
  matchers: getMatchersFor(integration),
  integrationName: integration,
  integrations: { syncMarkerIndex: getLastFullSyncMarkersIndex(namespace, integration) },
});

const buildFilterByIntegrationNames = (requiredIntegrationNames: string[]): string => {
  return requiredIntegrationNames
    .map((name) => `${monitoringEntitySourceTypeName}.attributes.name: ${name}`)
    .join(' OR ');
};

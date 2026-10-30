/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  getLatestEntityIndexPattern,
  getLegacySecurityLatestEntityIndexPattern,
} from '@kbn/entity-store/common';
import { checkEntityStoreIndexPrivileges } from '@kbn/entity-store/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES } from '../../../../common/entity_analytics/risk_engine';
import { getAlertsIndex } from '../../../../common/entity_analytics/utils';
import { getConfiguration } from '../risk_engine/utils/saved_object_configuration';
import { checkAndFormatPrivileges } from '../utils/check_and_format_privileges';
import { getRiskInputsIndex } from './get_risk_inputs_index';
import { getLookupIndexName } from './maintainer/lookup/lookup_index';

export const MISSING_INDEX_PRIVILEGES_MESSAGE =
  'You do not have the index privileges required to calculate risk scores.';

/**
 * Whether the request user holds the index privileges `recalculateEntityRiskScore` needs, since
 * it runs as that user:
 * - alerts index: `read` to search, `view_index_metadata` for the `indices.exists` check
 * - risk score index: `read`, `write`
 * - risk score lookup index: `read` (resolution search and ES|QL `LOOKUP JOIN`)
 * - entity store: `read`, `write`, plus `view_index_metadata` on the latest index, which the
 *   `indices.exists` check in `bulkUpdateEntity` needs. That check targets one concrete index, either
 *   the neutral or the legacy Security-scoped name, so the metadata privilege must be held on the
 *   same name that read/write passed on.
 *
 * The alerts index is resolved like the calculation does (engine config data view, else the
 * space's default alerts index).
 */
export const checkEntityRiskScoreCalculationPrivileges = async ({
  request,
  security,
  namespace,
  soClient,
  logger,
}: {
  request: KibanaRequest;
  security: SecurityPluginStart;
  namespace: string;
  soClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<boolean> => {
  const engineConfig = await getConfiguration({ savedObjectsClient: soClient, logger, namespace });
  const { index: alertsIndex } = engineConfig
    ? await getRiskInputsIndex({ dataViewId: engineConfig.dataViewId, logger, soClient })
    : { index: getAlertsIndex(namespace) };

  // Wildcards and exclusions are filtered by Elasticsearch to what the user can see; only
  // concrete names are rejected when unauthorized.
  const alertsIndexPrivileges = Object.fromEntries(
    alertsIndex
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name && !name.startsWith('-') && !name.includes('*'))
      .map((name) => [name, ['read', 'view_index_metadata']])
  );

  const neutralLatest = getLatestEntityIndexPattern(namespace);
  const legacyLatest = getLegacySecurityLatestEntityIndexPattern(namespace);

  const [indexPrivileges, entityStorePrivileges, latestMetadataPrivileges] = await Promise.all([
    checkAndFormatPrivileges({
      request,
      security,
      privilegesToCheck: {
        elasticsearch: {
          cluster: [],
          index: {
            ...alertsIndexPrivileges,
            ...RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
            [getLookupIndexName(namespace)]: ['read'],
          },
        },
      },
    }),
    checkEntityStoreIndexPrivileges({ request, security, spaceId: namespace }),
    // Both names in one request: only the one that read/write passed on is read below.
    checkAndFormatPrivileges({
      request,
      security,
      privilegesToCheck: {
        elasticsearch: {
          cluster: [],
          index: {
            [neutralLatest]: ['view_index_metadata'],
            [legacyLatest]: ['view_index_metadata'],
          },
        },
      },
    }),
  ]);

  // `checkEntityStoreIndexPrivileges` returns the result for the name that passed, so the latest
  // index in it is the one read/write was granted on. The calculation targets that same index.
  const storeIndexPrivileges = entityStorePrivileges.privileges?.elasticsearch?.index ?? {};
  const grantedLatest = [neutralLatest, legacyLatest].find((name) => name in storeIndexPrivileges);
  const canViewEntityStoreMetadata =
    grantedLatest !== undefined &&
    latestMetadataPrivileges.privileges.elasticsearch.index?.[grantedLatest]
      ?.view_index_metadata === true;

  return Boolean(
    indexPrivileges.has_all_required &&
      canViewEntityStoreMetadata &&
      entityStorePrivileges.has_read_permissions &&
      entityStorePrivileges.has_write_permissions
  );
};

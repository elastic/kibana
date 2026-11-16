/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { i18n } from '@kbn/i18n';
import { escapeQuotes } from '@kbn/es-query';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { routeId } from '../zod_query';
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { SyntheticsServerSetup } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { ConfigKey } from '../../../common/runtime_types';
import {
  legacyMonitorAttributes,
  syntheticsMonitorAttributes,
  syntheticsMonitorSOTypes,
} from '../../../common/types/saved_objects';

export const getConfigIdFromPackagePolicy = (policy: PackagePolicy): string | undefined => {
  for (const { streams } of policy.inputs) {
    for (const { vars } of streams) {
      const processors = vars?.processors?.value;
      if (!processors) continue;
      try {
        const configId = JSON.parse(processors)[0]?.add_fields?.fields?.config_id;
        if (configId) return configId;
      } catch (e) {
        // not a synthetics processors var
      }
    }
  }
};

/**
 * Looks in every space with the internal repository: the caller may only see
 * the integration's space, not the monitor's.
 */
const monitorExistsInAnySpace = async (server: SyntheticsServerSetup, configId: string) => {
  const escapedId = escapeQuotes(configId);
  const { total } = await server.coreStart.savedObjects.createInternalRepository().find({
    type: syntheticsMonitorSOTypes,
    namespaces: [ALL_SPACES_ID],
    perPage: 0,
    filter: `${syntheticsMonitorAttributes}.${ConfigKey.CONFIG_ID}: "${escapedId}" or ${legacyMonitorAttributes}.${ConfigKey.CONFIG_ID}: "${escapedId}"`,
  });
  return total > 0;
};

/**
 * `packagePolicyService.get` throws a not-found error for a missing policy; that
 * is left to the delete call below, as before the monitor guard existed.
 */
const getPackagePolicyIfExists = async (
  server: SyntheticsServerSetup,
  savedObjectsClient: SavedObjectsClientContract,
  packagePolicyId: string
): Promise<PackagePolicy | undefined> => {
  try {
    return (
      (await server.fleet.packagePolicyService.get(savedObjectsClient, packagePolicyId)) ??
      undefined
    );
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) return undefined;
    throw e;
  }
};

export const deletePackagePolicyRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.DELETE_PACKAGE_POLICY,
  validate: {
    params: z.strictObject({
      packagePolicyId: routeId,
    }),
  },
  handler: async ({
    request,
    response,
    savedObjectsClient,
    server,
    syntheticsEsClient,
  }): Promise<any> => {
    const { packagePolicyId } = request.params;

    const packagePolicy = await getPackagePolicyIfExists(
      server,
      savedObjectsClient,
      packagePolicyId
    );

    if (packagePolicy) {
      const configId = getConfigIdFromPackagePolicy(packagePolicy);

      if (!configId) {
        return response.conflict({
          body: {
            message: i18n.translate('xpack.synthetics.deleteIntegration.monitorUnknown', {
              defaultMessage:
                'Unable to verify that this integration is not used by a monitor, so it was not deleted.',
            }),
          },
        });
      }

      if (await monitorExistsInAnySpace(server, configId)) {
        return response.conflict({
          body: {
            message: i18n.translate('xpack.synthetics.deleteIntegration.monitorExists', {
              defaultMessage:
                'This integration belongs to an existing monitor, possibly in another space. Manage it from the monitor in Synthetics instead.',
            }),
          },
        });
      }
    }

    const res = await server.fleet.packagePolicyService.delete(
      savedObjectsClient,
      syntheticsEsClient.baseESClient,
      [packagePolicyId],
      {
        force: true,
      }
    );
    if (res?.[0].success) {
      return res;
    } else {
      throw new Error(res?.[0].body?.message);
    }
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import { getShardPool } from '../../../synthetics_service/private_location/assign_shards';
import { runRebalanceShardsTaskSoon } from '../../../tasks/rebalance_private_location_shards_task';
import { getAgentPoliciesAsInternalUser } from './get_agent_policies';
import type { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { toClientContract, updatePrivateLocationMonitors } from './helpers';
import type { PrivateLocation } from '../../../../common/runtime_types';
import { parseArrayFilters } from '../../common';
import { syntheticsMonitorSOTypes } from '../../../../common/types/saved_objects';

const EditPrivateLocationSchema = schema.object({
  label: schema.maybe(
    schema.string({
      minLength: 1,
    })
  ),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  // POC: scalable private locations shard monitors across a pool of agent
  // policies. `agentPolicyId` remains the primary/first shard for backwards
  // compatibility (spaces filtering, classic single-shard locations).
  agentPolicyId: schema.maybe(schema.string({ maxLength: 1024 })),
  agentPolicyIds: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: 1024 }), { maxSize: 100 })
  ),
});

const EditPrivateLocationQuery = schema.object({
  locationId: schema.string(),
});

export type EditPrivateLocationAttributes = Partial<
  Pick<PrivateLocationAttributes, keyof TypeOf<typeof EditPrivateLocationSchema>>
>;

const isPrivateLocationLabelChanged = (oldLabel: string, newLabel?: string): newLabel is string => {
  return typeof newLabel === 'string' && oldLabel !== newLabel;
};

const isPrivateLocationChanged = ({
  privateLocation,
  newParams,
}: {
  privateLocation: SavedObject<PrivateLocationAttributes>;
  newParams: TypeOf<typeof EditPrivateLocationSchema>;
}) => {
  const isLabelChanged = isPrivateLocationLabelChanged(
    privateLocation.attributes.label,
    newParams.label
  );
  const areTagsChanged =
    Array.isArray(newParams.tags) &&
    (!privateLocation.attributes.tags ||
      (privateLocation.attributes.tags &&
        !isEqual(privateLocation.attributes.tags, newParams.tags)));

  return isLabelChanged || areTagsChanged;
};

const checkPrivileges = async ({
  routeContext,
  monitorsSpaces,
}: {
  routeContext: RouteContext;
  monitorsSpaces: string[];
}) => {
  const { request, response, server } = routeContext;

  const checkSavedObjectsPrivileges =
    server.security.authz.checkSavedObjectsPrivilegesWithRequest(request);

  const results = await Promise.all(
    syntheticsMonitorSOTypes.map((soType) =>
      checkSavedObjectsPrivileges(`saved_object:${soType}/bulk_update`, monitorsSpaces)
    )
  );

  const hasAllRequested = results.every((result) => result.hasAllRequested);

  if (!hasAllRequested) {
    return response.forbidden({
      body: {
        message: i18n.translate('xpack.synthetics.editPrivateLocation.forbidden', {
          defaultMessage:
            'You do not have sufficient permissions to update monitors in all required spaces. This private location is used by monitors in spaces where you lack update privileges.',
        }),
      },
    });
  }
};

export const editPrivateLocationRoute: SyntheticsRestApiRouteFactory<
  PrivateLocation,
  TypeOf<typeof EditPrivateLocationQuery>,
  any,
  TypeOf<typeof EditPrivateLocationSchema>
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + '/{locationId}',
  validate: {},
  validation: {
    request: {
      body: EditPrivateLocationSchema,
      params: EditPrivateLocationQuery,
    },
  },
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
  handler: async (routeContext) => {
    const { response, request, savedObjectsClient } = routeContext;
    const { locationId } = request.params;
    const {
      label: newLocationLabel,
      tags: newTags,
      agentPolicyIds: newAgentPolicyIds,
    } = request.body;

    const repo = new PrivateLocationRepository(routeContext);

    try {
      const { filtersStr } = parseArrayFilters({
        locations: [locationId],
      });
      const [existingLocation, monitorsInLocation] = await Promise.all([
        repo.getPrivateLocation(locationId),
        routeContext.monitorConfigRepository.findDecryptedMonitors({
          spaceId: ALL_SPACES_ID,
          filter: filtersStr,
        }),
      ]);

      const existingPool = getShardPool(existingLocation.attributes);
      const requestedPool = newAgentPolicyIds?.filter(Boolean);
      const isPoolChanged = requestedPool !== undefined && !isEqual(existingPool, requestedPool);

      if (isPoolChanged && requestedPool!.length === 0) {
        return response.badRequest({
          body: {
            message: i18n.translate('xpack.synthetics.editPrivateLocation.emptyPool', {
              defaultMessage: 'A private location must have at least one agent policy.',
            }),
          },
        });
      }

      // Reject a pool that references agent policies that don't exist, otherwise
      // monitors would be sharded onto a non-existent shard and silently fail.
      if (isPoolChanged) {
        const agentPolicies = await getAgentPoliciesAsInternalUser({
          server: routeContext.server,
          spaceId: routeContext.spaceId,
        });
        const missingPolicyIds = requestedPool!.filter(
          (id) => !agentPolicies?.some((policy) => policy.id === id)
        );
        if (missingPolicyIds.length > 0) {
          return response.badRequest({
            body: {
              message: i18n.translate('xpack.synthetics.editPrivateLocation.missingAgentPolicies', {
                defaultMessage:
                  'Agent {count, plural, one {policy} other {policies}} with id {ids} does not exist.',
                values: { count: missingPolicyIds.length, ids: missingPolicyIds.join(', ') },
              }),
            },
          });
        }
      }

      const labelChanged = isPrivateLocationLabelChanged(
        existingLocation.attributes.label,
        newLocationLabel
      );

      let newLocation: Awaited<ReturnType<typeof repo.editPrivateLocation>> | undefined;

      if (
        isPrivateLocationChanged({ privateLocation: existingLocation, newParams: request.body }) ||
        isPoolChanged
      ) {
        // Both a label change and a pool change rewrite the monitors in this
        // location (label denormalization / re-sharding of package policies), so
        // require monitor bulk-update rights in every affected space for either.
        if ((labelChanged || isPoolChanged) && monitorsInLocation.length) {
          await checkPrivileges({
            routeContext,
            monitorsSpaces: monitorsInLocation.map(({ namespaces }) => namespaces![0]),
          });
        }

        newLocation = await repo.editPrivateLocation(locationId, {
          label: newLocationLabel || existingLocation.attributes.label,
          tags: newTags || existingLocation.attributes.tags,
          ...(isPoolChanged
            ? { agentPolicyId: requestedPool![0], agentPolicyIds: requestedPool }
            : {}),
        });

        // Re-sync monitors when the label OR the shard pool changed: the label is
        // denormalized onto each monitor, and a pool change re-shards the monitors'
        // package policies across the new pool via rendezvous hashing.
        if (labelChanged || isPoolChanged) {
          await updatePrivateLocationMonitors({
            locationId,
            newLocationLabel: newLocationLabel || existingLocation.attributes.label,
            allPrivateLocations: await getPrivateLocations(savedObjectsClient),
            routeContext,
            monitorsInLocation,
          });
        }

        // A pool change can shard monitors onto an offline agent policy; kick the
        // rebalance task now (instead of waiting up to a scheduled tick) so they
        // land on a healthy shard promptly. Fire-and-forget: it retries internally.
        if (isPoolChanged) {
          void runRebalanceShardsTaskSoon({ server: routeContext.server });
        }
      }

      return toClientContract({
        ...existingLocation,
        attributes: {
          ...existingLocation.attributes,
          ...(newLocation ? newLocation.attributes : {}),
        },
      });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return response.notFound({
          body: {
            message: `Private location with id ${locationId} does not exist.`,
          },
        });
      }
      throw error;
    }
  },
});

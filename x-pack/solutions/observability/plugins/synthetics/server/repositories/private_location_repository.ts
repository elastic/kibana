/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { isEmpty } from 'lodash';
import { getAgentPoliciesAsInternalUser } from '../routes/settings/private_locations/get_agent_policies';
import { getShardPool } from '../synthetics_service/private_location/assign_shards';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import type { PrivateLocationObject } from '../routes/settings/private_locations/add_private_location';
import type { RouteContext } from '../routes/types';
import { privateLocationSavedObjectName } from '../../common/saved_objects/private_locations';
import type { EditPrivateLocationAttributes } from '../routes/settings/private_locations/edit_private_location';

export class PrivateLocationRepository {
  internalSOClient: ISavedObjectsRepository;
  constructor(private routeContext: RouteContext) {
    const { server } = routeContext;
    this.internalSOClient = server.coreStart.savedObjects.createInternalRepository();
  }

  async createPrivateLocation(formattedLocation: PrivateLocationAttributes, newId: string) {
    const { savedObjectsClient } = this.routeContext;
    const { spaces } = formattedLocation;

    return await savedObjectsClient.create<PrivateLocationAttributes>(
      privateLocationSavedObjectName,
      formattedLocation,
      {
        id: newId,
        initialNamespaces: isEmpty(spaces) || spaces?.includes('*') ? ['*'] : spaces,
      }
    );
  }

  async getPrivateLocation(locationId: string) {
    const { savedObjectsClient } = this.routeContext;

    return savedObjectsClient.get<PrivateLocationAttributes>(
      privateLocationSavedObjectName,
      locationId
    );
  }

  async editPrivateLocation(locationId: string, newAttributes: EditPrivateLocationAttributes) {
    const { savedObjectsClient } = this.routeContext;

    return savedObjectsClient.update<PrivateLocationAttributes>(
      privateLocationSavedObjectName,
      locationId,
      newAttributes
    );
  }

  getLocationSpaces({
    locationSpaces,
    agentPolicySpaces,
  }: {
    locationSpaces?: string[];
    agentPolicySpaces: string[];
  }): string[] {
    if (locationSpaces?.length) return locationSpaces;
    return agentPolicySpaces;
  }

  async validatePrivateLocation({
    agentPolicySpaces,
    spaceId,
  }: {
    agentPolicySpaces: string[];
    spaceId: string;
  }) {
    const { response, request, server } = this.routeContext;

    let errorMessages = '';

    const location = request.body as PrivateLocationObject;

    const { spaces } = location;

    const [data, agentPolicies] = await Promise.all([
      this.internalSOClient.find<PrivateLocationAttributes>({
        type: privateLocationSavedObjectName,
        perPage: 10000,
        namespaces: this.getLocationSpaces({ locationSpaces: spaces, agentPolicySpaces }),
      }),
      await getAgentPoliciesAsInternalUser({ server, spaceId }),
    ]);

    const locations = data.saved_objects.map((loc) => ({
      ...loc.attributes,
      spaces: loc.attributes.spaces || loc.namespaces,
    }));

    // POC: scalable private locations declare a pool of agent policies (shards),
    // so the "one agent policy per location" uniqueness check doesn't apply.
    const isScalable = (location.agentPolicyIds?.length ?? 0) > 1;

    const locWithAgentPolicyId = locations.find(
      (loc) => loc.agentPolicyId === location.agentPolicyId
    );

    if (!isScalable && locWithAgentPolicyId) {
      errorMessages = i18n.translate(
        'xpack.synthetics.privateLocations.create.errorMessages.policyExists',
        {
          defaultMessage: `Private location with agentPolicyId {agentPolicyId} already exists in spaces {spaces}`,
          values: {
            agentPolicyId: location.agentPolicyId,
            spaces: formatSpaces(locWithAgentPolicyId.spaces),
          },
        }
      );
    }

    // return if name is already taken
    const locWithSameLabel = locations.find((loc) => loc.label === location.label);
    if (locWithSameLabel) {
      errorMessages = i18n.translate(
        'xpack.synthetics.privateLocations.create.errorMessages.labelExists',
        {
          defaultMessage: `Private location with label {label} already exists in spaces: {spaces}`,
          values: { label: location.label, spaces: formatSpaces(locWithSameLabel.spaces) },
        }
      );
    }

    // Validate every shard in the pool exists, not just the primary — a scalable
    // location that points at a missing policy would silently shard monitors onto
    // a non-existent shard.
    const poolIds = getShardPool(location);
    const missingPolicyIds = poolIds.filter(
      (id) => !agentPolicies?.some((policy) => policy.id === id)
    );
    if (missingPolicyIds.length > 0) {
      errorMessages = `Agent ${
        missingPolicyIds.length > 1 ? 'policies' : 'policy'
      } with id ${missingPolicyIds.join(', ')} does not exist`;
    }
    if (errorMessages) {
      return response.badRequest({
        body: {
          message: errorMessages,
        },
      });
    }
  }
}

const formatSpaces = (spaces: string[] | undefined) => {
  return (
    spaces
      ?.map((space) =>
        space === '*'
          ? i18n.translate('xpack.synthetics.formatSpaces.', { defaultMessage: '* All Spaces' })
          : space
      )
      .join(', ') ?? 'Unknown'
  );
};

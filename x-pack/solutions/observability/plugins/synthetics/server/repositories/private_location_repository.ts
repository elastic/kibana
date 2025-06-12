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
import { PrivateLocationAttributes } from '../runtime_types/private_locations';
import { PrivateLocationObject } from '../routes/settings/private_locations/add_private_location';
import { RouteContext } from '../routes/types';
import { privateLocationSavedObjectName } from '../../common/saved_objects/private_locations';

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
  async validatePrivateLocation() {
    const { response, request, server } = this.routeContext;

    let errorMessages = '';

    const location = request.body as PrivateLocationObject;

    const { spaces } = location;

    const [data, agentPolicies] = await Promise.all([
      this.internalSOClient.find<PrivateLocationAttributes>({
        type: privateLocationSavedObjectName,
        perPage: 10000,
        namespaces: spaces,
      }),
      await getAgentPoliciesAsInternalUser({ server }),
    ]);

    const locations = data.saved_objects.map((loc) => ({
      ...loc.attributes,
      spaces: loc.attributes.spaces || loc.namespaces,
    }));

    const locWithAgentPolicyId = locations.find(
      (loc) => loc.agentPolicyId === location.agentPolicyId
    );

    if (locWithAgentPolicyId) {
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

    const agentPolicy = agentPolicies?.find((policy) => policy.id === location.agentPolicyId);
    if (!agentPolicy) {
      errorMessages = `Agent policy with id ${location.agentPolicyId} does not exist`;
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

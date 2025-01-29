/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObject } from '@kbn/core/server';
import { AgentPolicyInfo } from '../../../../common/types';
import type { SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import type {
  SyntheticsPrivateLocationsAttributes,
  PrivateLocationAttributes,
} from '../../../runtime_types/private_locations';
import { PrivateLocation } from '../../../../common/runtime_types';

export const toClientContract = (
  locationObject: SavedObject<PrivateLocationAttributes>
): PrivateLocation => {
  const location = locationObject.attributes;
  return {
    label: location.label,
    id: location.id,
    agentPolicyId: location.agentPolicyId,
    isServiceManaged: false,
    isInvalid: false,
    tags: location.tags,
    geo: location.geo,
    spaces: locationObject.namespaces,
  };
};

export const allLocationsToClientContract = (
  attributes: SyntheticsPrivateLocationsAttributes,
  agentPolicies?: AgentPolicyInfo[]
): SyntheticsPrivateLocations => {
  return attributes.locations.map((location) => {
    const agPolicy = agentPolicies?.find((policy) => policy.id === location.agentPolicyId);
    return {
      label: location.label,
      id: location.id,
      agentPolicyId: location.agentPolicyId,
      isServiceManaged: false,
      isInvalid: !Boolean(agPolicy),
      tags: location.tags,
      geo: location.geo,
      spaces: location.spaces,
    };
  });
};

export const toSavedObjectContract = (location: PrivateLocation): PrivateLocationAttributes => {
  return {
    label: location.label,
    id: location.id,
    agentPolicyId: location.agentPolicyId,
    tags: location.tags,
    isServiceManaged: false,
    geo: location.geo,
    namespace: location.namespace,
    spaces: location.spaces,
  };
};

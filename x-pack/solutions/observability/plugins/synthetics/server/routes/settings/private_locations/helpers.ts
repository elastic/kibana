/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObject } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { MonitorConfigRepository } from '../../../services/monitor_config_repository';
import { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { AgentPolicyInfo } from '../../../../common/types';
import type {
  MonitorFields,
  SyntheticsMonitorWithSecretsAttributes,
  SyntheticsPrivateLocations,
} from '../../../../common/runtime_types';
import type {
  SyntheticsPrivateLocationsAttributes,
  PrivateLocationAttributes,
} from '../../../runtime_types/private_locations';
import { PrivateLocation } from '../../../../common/runtime_types';
import { parseArrayFilters } from '../../common';

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

// This should be called when changing the label of a private location because the label is also stored
// in the locations array of monitors attributes
export const updatePrivateLocationMonitors = async ({
  locationId,
  newLocationLabel,
  monitorConfigRepository,
  syntheticsMonitorClient,
  allPrivateLocations,
}: {
  locationId: string;
  newLocationLabel: string;
  monitorConfigRepository: MonitorConfigRepository;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  allPrivateLocations: SyntheticsPrivateLocations;
}) => {
  const { filtersStr } = parseArrayFilters({
    locations: [locationId],
  });
  const monitorsToUpdate = await monitorConfigRepository.findDecryptedMonitors({
    spaceId: ALL_SPACES_ID,
    filter: filtersStr,
  });
  // The key in this case is the spaceId
  const dataToUpdatePolicies = monitorsToUpdate.reduce<
    Record<
      string,
      Array<{
        monitor: MonitorFields;
        id: string;
        decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>;
      }>
    >
  >((acc, m) => {
    const newLocations = m.attributes.locations.map((l) =>
      l.id !== locationId ? l : { ...l, label: newLocationLabel }
    );
    // TODO: Type assertion required due to a structural type mismatch between
    // what's returned by findDecryptedMonitors and what's expected by bulkUpdate.
    // This pattern is used throughout the codebase when calling bulkUpdate.
    // A future refactoring should address this type inconsistency at its source.
    const newAttributes = { ...m.attributes, locations: newLocations } as unknown as MonitorFields;

    const namespace = m.attributes.namespace;
    return {
      ...acc,
      [namespace]: [
        ...(acc[namespace] || []),
        { monitor: newAttributes, id: m.id, decryptedPreviousMonitor: m },
      ],
    };
  }, {});

  const promises = Object.keys(dataToUpdatePolicies).map((namespace) => [
    syntheticsMonitorClient.editMonitors(
      dataToUpdatePolicies[namespace],
      allPrivateLocations,
      namespace
    ),
    monitorConfigRepository.bulkUpdate({
      monitors: dataToUpdatePolicies[namespace].map(({ id, monitor }) => ({
        id,
        attributes: monitor,
      })),
    }),
  ]);

  return Promise.all(promises.flat());
};

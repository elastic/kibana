/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject, SavedObjectsFindResult } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { formatSecrets, normalizeSecrets } from '../../../synthetics_service/utils';
import type { AgentPolicyInfo } from '../../../../common/types';
import type {
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
  SyntheticsPrivateLocations,
} from '../../../../common/runtime_types';
import type {
  SyntheticsPrivateLocationsAttributes,
  PrivateLocationAttributes,
} from '../../../runtime_types/private_locations';
import type { PrivateLocation } from '../../../../common/runtime_types';
import type { MonitorConfigUpdate } from '../../monitor_cruds/bulk_cruds/edit_monitor_bulk';
import { syncEditedMonitorBulk } from '../../monitor_cruds/bulk_cruds/edit_monitor_bulk';
import type { RouteContext } from '../../types';

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
    ...(location.isAgentSharding === true ? { isAgentSharding: true } : {}),
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
      ...(location.isAgentSharding === true ? { isAgentSharding: true } : {}),
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
    ...(location.isAgentSharding === true ? { isAgentSharding: true } : {}),
  };
};

// Label and sharding edits must rewrite this location's monitors: the label is
// stored on each monitor's locations array, and toggling isAgentSharding
// restamps (or clears) per-monitor `${agent.id}` package-policy conditions.
export const updatePrivateLocationMonitors = async ({
  locationId,
  newLocationLabel,
  allPrivateLocations,
  routeContext,
  monitorsInLocation,
}: {
  locationId: string;
  newLocationLabel: string;
  allPrivateLocations: SyntheticsPrivateLocations;
  routeContext: RouteContext;
  monitorsInLocation: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>>;
}) => {
  const updatedMonitorsPerSpace = monitorsInLocation.reduce<Record<string, MonitorConfigUpdate[]>>(
    (acc, m) => {
      const decryptedMonitorsWithNormalizedSecrets: SavedObject<SyntheticsMonitor> =
        normalizeSecrets(m);
      const normalizedMonitor = decryptedMonitorsWithNormalizedSecrets.attributes;
      const newLocations = m.attributes.locations.map((l) =>
        l.id !== locationId ? l : { ...l, label: newLocationLabel }
      );
      const monitorWithRevision = formatSecrets({ ...normalizedMonitor, locations: newLocations });
      const monitorToUpdate: MonitorConfigUpdate = {
        normalizedMonitor,
        decryptedPreviousMonitor: m,
        monitorWithRevision,
      };

      const spaceId = m.namespaces?.[0] || 'default'; // Default to 'default' if no namespace is found
      return {
        ...acc,
        [spaceId]: [...(acc[spaceId] || []), monitorToUpdate],
      };
    },
    {}
  );

  const promises = Object.keys(updatedMonitorsPerSpace).map((spaceId) => [
    syncEditedMonitorBulk({
      monitorsToUpdate: updatedMonitorsPerSpace[spaceId],
      privateLocations: allPrivateLocations,
      routeContext,
      spaceId,
    }),
  ]);

  const results = await Promise.all(promises.flat());
  if (
    results.some((result) => result?.failedConfigs && Object.keys(result.failedConfigs).length > 0)
  ) {
    throw new Error(
      i18n.translate('xpack.synthetics.editPrivateLocation.monitorRewriteFailed', {
        defaultMessage: 'Failed to update monitors for this private location.',
      })
    );
  }
  return results;
};

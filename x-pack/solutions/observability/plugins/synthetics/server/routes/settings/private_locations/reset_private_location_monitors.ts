/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject, SavedObjectsFindResult } from '@kbn/core/server';
import { formatSecrets, normalizeSecrets } from '../../../synthetics_service/utils';
import type {
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
  SyntheticsPrivateLocations,
} from '../../../../common/runtime_types';
import type { MonitorConfigUpdate } from '../../monitor_cruds/bulk_cruds/edit_monitor_bulk';
import { syncUpdatedMonitors } from '../../monitor_cruds/bulk_cruds/edit_monitor_bulk';
import type { RouteContext } from '../../types';

export const resetPrivateLocationMonitors = async ({
  allPrivateLocations,
  routeContext,
  monitorsInLocation,
}: {
  allPrivateLocations: SyntheticsPrivateLocations;
  routeContext: RouteContext;
  monitorsInLocation: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>>;
}) => {
  const updatedMonitorsPerSpace = monitorsInLocation.reduce<Record<string, MonitorConfigUpdate[]>>(
    (acc, m) => {
      const decryptedMonitorsWithNormalizedSecrets: SavedObject<SyntheticsMonitor> =
        normalizeSecrets(m);
      const normalizedMonitor = decryptedMonitorsWithNormalizedSecrets.attributes;
      const monitorWithRevision = formatSecrets(normalizedMonitor);
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
    syncUpdatedMonitors({
      monitorsToUpdate: updatedMonitorsPerSpace[spaceId],
      routeContext,
      spaceId,
      privateLocations: allPrivateLocations,
    }),
  ]);

  return Promise.all(promises.flat());
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { MonitorFields, SyntheticsPrivateLocations } from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/runtime_types';
import { syntheticsMonitorSavedObjectType } from '../../../common/types/saved_objects';
import type { RouteContext } from '../types';

/**
 * Returns true if a private location's spaces cover every space in the monitor's space list.
 * A private location with '*' (ALL_SPACES_ID) covers all monitor spaces.
 */
export const privateLocationCoversAllMonitorSpaces = (
  monitorSpaces: string[],
  locationSpaces: string[] | undefined
): boolean => {
  if (!locationSpaces || locationSpaces.length === 0) {
    return false;
  }

  const locationIsAllSpaces = locationSpaces.includes(ALL_SPACES_ID);
  const monitorIsAllSpaces = monitorSpaces.includes(ALL_SPACES_ID);

  if (monitorIsAllSpaces) {
    return locationIsAllSpaces;
  }

  if (locationIsAllSpaces) {
    return true;
  }

  const locationSpaceSet = new Set(locationSpaces);
  return monitorSpaces.every((space) => locationSpaceSet.has(space));
};

interface PrivateLocationSpaceError {
  locationId: string;
  locationLabel: string;
  monitorSpaces: string[];
  missingSpaces: string[];
}

interface ValidationError {
  message: string;
  attributes: {
    errors: PrivateLocationSpaceError[];
  };
}

/**
 * Validates that every private location on a monitor is available in all the monitor's spaces.
 * Returns null if valid, or a structured error describing which locations fail.
 */
export const validateMonitorPrivateLocationSpaces = (
  monitor: MonitorFields,
  allPrivateLocations: SyntheticsPrivateLocations
): ValidationError | null => {
  const monitorSpaces = monitor[ConfigKey.KIBANA_SPACES] ?? [];
  if (monitorSpaces.length === 0) {
    return null;
  }

  const privateLocations = (monitor[ConfigKey.LOCATIONS] ?? []).filter(
    (loc) => !loc.isServiceManaged
  );
  if (privateLocations.length === 0) {
    return null;
  }

  const errors: PrivateLocationSpaceError[] = [];

  for (const loc of privateLocations) {
    const matchedLocation = allPrivateLocations.find(
      (privateLocation) => privateLocation.id === loc.id
    );
    const locationSpaces = matchedLocation?.spaces;

    if (!privateLocationCoversAllMonitorSpaces(monitorSpaces, locationSpaces)) {
      const monitorIsAllSpaces = monitorSpaces.includes(ALL_SPACES_ID);
      const locationSpaceSet = new Set(locationSpaces ?? []);
      const missingSpaces = monitorIsAllSpaces
        ? ['*']
        : monitorSpaces.filter((s) => !locationSpaceSet.has(s));

      errors.push({
        locationId: loc.id,
        locationLabel: loc.label ?? loc.id,
        monitorSpaces,
        missingSpaces,
      });
    }
  }

  if (errors.length === 0) {
    return null;
  }

  const locationLabels = errors.map((e) => e.locationLabel).join(', ');

  return {
    message: i18n.translate('xpack.synthetics.validation.privateLocationSpaceCoverage', {
      defaultMessage:
        'The following private locations are not available in all spaces this monitor is shared to: {locationLabels}. ' +
        'Either share the private locations to all monitor spaces, or remove those spaces from the monitor.',
      values: { locationLabels },
    }),
    attributes: { errors },
  };
};

type MonitorSavedObjectBulkAction = 'bulk_update' | 'bulk_delete';

/** Asserts that the current user has the requested privileges in all specified spaces. */
export const assertCanPerformMonitorBulkActionInAllSpaces = async (
  routeContext: RouteContext,
  spaceIds: string[],
  savedObjectType: string = syntheticsMonitorSavedObjectType,
  action: MonitorSavedObjectBulkAction = 'bulk_update'
) => {
  const { request, response, server, spaceId } = routeContext;

  const uniqueSpaces = [...new Set(spaceIds)];
  const hasAllSpaces = uniqueSpaces.includes(ALL_SPACES_ID);

  if (!hasAllSpaces && uniqueSpaces.length <= 1 && uniqueSpaces[0] === spaceId) {
    return;
  }
  if (uniqueSpaces.length === 0) {
    return;
  }

  const checkSavedObjectsPrivileges =
    server.security.authz.checkSavedObjectsPrivilegesWithRequest(request);

  const { hasAllRequested } = await checkSavedObjectsPrivileges(
    `saved_object:${savedObjectType}/${action}`,
    uniqueSpaces
  );

  if (!hasAllRequested) {
    const isDeleteAction = action === 'bulk_delete';
    return response.forbidden({
      body: {
        message: isDeleteAction
          ? i18n.translate('xpack.synthetics.validation.multiSpaceDeletePermissions', {
              defaultMessage:
                'This monitor is shared to spaces where you do not have delete permissions. To delete it, request access to those spaces.',
            })
          : i18n.translate('xpack.synthetics.validation.multiSpacePermissions', {
              defaultMessage:
                'This monitor is shared to spaces where you do not have update permissions. To save changes, either request access to those spaces or remove them from the monitor.',
            }),
      },
    });
  }
};

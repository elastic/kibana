
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX, SavedObjectsModelVersion } from '@kbn/core/packages/saved-objects/server';
import type { SavedObjectsType } from '@kbn/core/server';


export const privilegeMonitoringTypeName = 'privilege-monitoring-status';

export const privilegeMonitoringTypeNameMappings: SavedObjectsType['mappings'] = {
    dynamic: false,
    properties: {
        status: {
            type: 'keyword',
        },
    },
  };

  const version1: SavedObjectsModelVersion = {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          status: { type: 'keyword' },
        },
      },
    ],
  };

  export const privilegeMonitoringType: SavedObjectsType = {
    name: privilegeMonitoringTypeName,
    indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'multiple-isolated',
    mappings: privilegeMonitoringTypeNameMappings,
    modelVersions: { 1: version1 },
  };
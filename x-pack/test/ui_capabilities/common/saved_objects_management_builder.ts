/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const allSavedObjectTypes = [
  'config',
  'telemetry',
  'graph-workspace',
  'ml-telemetry',
  'apm-telemetry',
  'map',
  'maps-telemetry',
  'canvas-workpad',
  'infrastructure-ui-source',
  'upgrade-assistant-reindex-operation',
  'upgrade-assistant-telemetry',
  'index-pattern',
  'visualization',
  'search',
  'dashboard',
  'url',
  'server',
  'kql-telemetry',
  'timelion-sheet',
];

class SavedObjectsTypeUICapabilitiesGroup {
  public all = ['delete', 'edit', 'read'];
  public read = ['read'];
}
const savedObjectsTypeUICapabilitiesGroup = new SavedObjectsTypeUICapabilitiesGroup();

interface OnlyParameters {
  all?: string | string[];
  read?: string | string[];
}

const coerceToArray = <T>(itemOrItemsOrNil: T | T[] | undefined): T[] => {
  if (itemOrItemsOrNil == null) {
    return [];
  }

  return Array.isArray(itemOrItemsOrNil) ? itemOrItemsOrNil : [itemOrItemsOrNil];
};

export const savedObjectsManagementBuilder = {
  all(group: keyof SavedObjectsTypeUICapabilitiesGroup) {
    return allSavedObjectTypes.reduce(
      (acc, savedObjectType) => ({
        ...acc,
        [savedObjectType]: savedObjectsTypeUICapabilitiesGroup[group].reduce(
          (acc2, uiCapability) => ({
            ...acc2,
            [uiCapability]: true,
          }),
          {}
        ),
      }),
      {}
    );
  },
  only(parameters: OnlyParameters): Record<string, boolean> {
    const readTypes = coerceToArray(parameters.read);
    const allTypes = coerceToArray(parameters.all);
    return allSavedObjectTypes.reduce(
      (acc, savedObjectType) => ({
        ...acc,
        [savedObjectType]: savedObjectsTypeUICapabilitiesGroup.all.reduce(
          (acc2, uiCapability) => ({
            ...acc2,
            [uiCapability]:
              (readTypes.includes(savedObjectType) &&
                savedObjectsTypeUICapabilitiesGroup.read.includes(uiCapability)) ||
              (allTypes.includes(savedObjectType) &&
                savedObjectsTypeUICapabilitiesGroup.all.includes(uiCapability)),
          }),
          {}
        ),
      }),
      {}
    );
  },
};

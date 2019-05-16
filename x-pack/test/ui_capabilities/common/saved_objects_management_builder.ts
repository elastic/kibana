/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */
class SavedObjectsTypeUICapabilitiesGroup {
  public all = ['delete', 'edit', 'read'];
  public read = ['read'];
  public none = [] as string[];
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

export class SavedObjectsManagementBuilder {
  private allSavedObjectTypes: string[];

  constructor(spacesEnabled: boolean) {
    this.allSavedObjectTypes = [
      ...(spacesEnabled ? ['space'] : []),
      'config',
      'telemetry',
      'graph-workspace',
      'ml-telemetry',
      'apm-telemetry',
      'map',
      'maps-telemetry',
      'canvas-workpad',
      'canvas-element',
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
      'ui-metric',
      'sample-data-telemetry',
    ];
  }

  public uiCapabilities(group: keyof SavedObjectsTypeUICapabilitiesGroup) {
    return savedObjectsTypeUICapabilitiesGroup.all.reduce(
      (acc2, uiCapability) => ({
        ...acc2,
        [uiCapability]: savedObjectsTypeUICapabilitiesGroup[group].includes(uiCapability),
      }),
      {}
    );
  }

  public build(parameters: OnlyParameters): Record<string, boolean> {
    const readTypes = coerceToArray(parameters.read);
    const allTypes = coerceToArray(parameters.all);
    return this.allSavedObjectTypes.reduce(
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
  }
}

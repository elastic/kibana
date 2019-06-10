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

export class SavedObjectsManagementBuilder {
  public uiCapabilities(group: keyof SavedObjectsTypeUICapabilitiesGroup) {
    return savedObjectsTypeUICapabilitiesGroup.all.reduce(
      (acc2, uiCapability) => ({
        ...acc2,
        [uiCapability]: savedObjectsTypeUICapabilitiesGroup[group].includes(uiCapability),
      }),
      {}
    );
  }
}

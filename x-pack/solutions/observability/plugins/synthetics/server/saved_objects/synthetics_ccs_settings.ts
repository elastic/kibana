/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { i18n } from '@kbn/i18n';

export const SO_SYNTHETICS_CCS_SETTINGS_TYPE = 'synthetics-ccs-settings';

export const syntheticsCCSSettingsObjectId = (space: string = 'default') =>
  `synthetics-ccs-settings-singleton-${space}`;

export const syntheticsCCSSettings: SavedObjectsType = {
  name: SO_SYNTHETICS_CCS_SETTINGS_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  modelVersions: {},
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    displayName: i18n.translate('xpack.synthetics.savedObject.ccsSettings.displayName', {
      defaultMessage: 'Synthetics CCS Settings',
    }),
    importableAndExportable: false,
  },
};

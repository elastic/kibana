/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

export const SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE = 'synthetics-settings-multi-space';

export const syntheticsSettingsMultiSpace: SavedObjectsType = {
  name: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    displayName: i18n.translate(
      'xpack.synthetics.savedObject.syntheticsSettingsMultiSpace.displayName',
      {
        defaultMessage: 'Synthetics CCS Settings',
      }
    ),
    importableAndExportable: false,
    getTitle: () =>
      i18n.translate('xpack.synthetics.savedObject.syntheticsSettingsMultiSpace.title', {
        defaultMessage: 'Synthetics CCS Settings',
      }),
  },
};

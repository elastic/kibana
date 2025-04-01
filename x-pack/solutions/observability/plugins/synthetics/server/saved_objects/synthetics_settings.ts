/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { SavedObjectsType } from '@kbn/core-saved-objects-server';

export const uptimeSettingsObjectType = 'uptime-dynamic-settings';
export const uptimeSettingsObjectId = 'uptime-dynamic-settings-singleton';

export const syntheticsSettingsObjectType = 'synthetics-dynamic-settings';
export const syntheticsSettingsObjectId = 'synthetics-dynamic-settings-singleton';

export const syntheticsSettings: SavedObjectsType = {
  name: syntheticsSettingsObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: true,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.synthetics.settings.index', {
        defaultMessage: 'Synthetics settings',
      }),
  },
};

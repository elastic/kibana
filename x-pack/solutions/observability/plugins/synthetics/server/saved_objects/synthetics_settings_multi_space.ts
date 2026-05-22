/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

export const SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE = 'synthetics-settings-multi-space';

const syntheticsSettingsMultiSpaceSchemaV1 = schema.object(
  {
    useAllRemoteClusters: schema.maybe(schema.boolean()),
    selectedRemoteClusters: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  },
  { unknowns: 'ignore' }
);

export const syntheticsSettingsMultiSpace: SavedObjectsType = {
  name: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: syntheticsSettingsMultiSpaceSchemaV1,
        forwardCompatibility: syntheticsSettingsMultiSpaceSchemaV1,
      },
    },
  },
  management: {
    displayName: i18n.translate(
      'xpack.synthetics.savedObject.syntheticsSettingsMultiSpace.displayName',
      {
        defaultMessage: 'Synthetics Settings multi-space',
      }
    ),
    importableAndExportable: false,
    getTitle: () =>
      i18n.translate('xpack.synthetics.savedObject.syntheticsSettingsMultiSpace.title', {
        defaultMessage: 'Synthetics Settings multi-space',
      }),
  },
};

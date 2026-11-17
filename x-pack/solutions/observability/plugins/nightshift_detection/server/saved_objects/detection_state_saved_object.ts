/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';

/** The saved object type that holds the engine's state documents. */
export const DETECTION_STATE_SO_TYPE = 'nightshift-detection-state';

/**
 * One object per state document, in the space it belongs to, so the state of a space goes with the
 * space. Hidden: the engine reads and writes it with the internal repository. The attributes are
 * the document itself and are not searched, so a new kind of state needs no mapping change.
 */
export const detectionStateSavedObjectType: SavedObjectsType = {
  name: DETECTION_STATE_SO_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: { dynamic: false, properties: {} },
  management: { importableAndExportable: false },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: schema.object({}, { unknowns: 'allow' }),
        forwardCompatibility: schema.object({}, { unknowns: 'ignore' }),
      },
    },
  },
};

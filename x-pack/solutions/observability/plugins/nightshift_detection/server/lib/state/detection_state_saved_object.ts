/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';

/** The saved object type that holds the engine's state. */
export const DETECTION_STATE_SO_TYPE = 'nightshift-detection-state';

/** The lease that serialises engine runs of one space. One per space, with the id `lease`. */
export interface RunLeaseAttributes {
  /** Unique per acquisition, so a holder can tell its lease from one that took its place. */
  owner: string;
  acquired_at: string;
  expires_at: string;
}

/** Where a strategy's signal generator got to. One per strategy and space. */
export interface GeneratorStateAttributes {
  /** End of the last fully processed minute, in epoch milliseconds. */
  processed_until: number;
}

/**
 * The engine's state, one object per document in the space it belongs to, so the state of a space
 * goes with the space. Hidden: the engine reads and writes it with the internal repository. The
 * attributes are not searched, so a new kind of state needs no mapping change.
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
        // One type holds both kinds of document, so every field is optional. Dropping them would let
        // an older node read a newer document as empty during a rolling upgrade.
        forwardCompatibility: schema.object(
          {
            owner: schema.maybe(schema.string()),
            acquired_at: schema.maybe(schema.string()),
            expires_at: schema.maybe(schema.string()),
            processed_until: schema.maybe(schema.number()),
          },
          { unknowns: 'ignore' }
        ),
      },
    },
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';

export const ResolutionRuleOverridesTypeName = 'entity-store-resolution-rule-overrides';

/**
 * Attributes stored in the resolution-rule-overrides SO.
 *
 * `overrides` maps each rule ID to `false` when the operator has explicitly
 * disabled it.  Missing keys mean "use the OOTB default" (enabled).
 * Stage 0 does not support `true` overrides — rules are either disabled or
 * running at their default-enabled state.
 */
export interface ResolutionRuleOverridesAttributes {
  overrides: Record<string, boolean>;
}

const overridesSchema = schema.object(
  {},
  {
    unknowns: 'allow',
  }
);

const version1Schema = schema.object({ overrides: overridesSchema }, { unknowns: 'ignore' });

export const ResolutionRuleOverridesType: SavedObjectsType = {
  name: ResolutionRuleOverridesTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  hiddenFromHttpApis: true,
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: version1Schema,
        forwardCompatibility: version1Schema,
      },
    },
  },
};

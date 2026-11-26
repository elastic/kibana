/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { RULE_LIBRARY_SO_TYPE } from '@kbn/security-rule-libraries';
import type { RuleLibraryAttributes } from '@kbn/security-rule-libraries';

const MAX_LIBRARIES = 1000;

export interface VisibleRuleLibrary {
  id: string;
  attributes: RuleLibraryAttributes;
}

// Shared libraries plus the ones that belong to the given space. `client` must include the hidden library type.
export const findVisibleRuleLibraries = async (
  client: SavedObjectsClientContract,
  spaceId: string
): Promise<VisibleRuleLibrary[]> => {
  const { saved_objects: savedObjects } = await client.find<RuleLibraryAttributes>({
    type: RULE_LIBRARY_SO_TYPE,
    perPage: MAX_LIBRARIES,
  });

  return savedObjects
    .filter(({ attributes }) => !attributes.space_id || attributes.space_id === spaceId)
    .map(({ id, attributes }) => ({ id, attributes }));
};

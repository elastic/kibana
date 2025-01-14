/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitySourceDefinition } from '@kbn/entityManager-plugin/server/lib/v2/types';
import { concat, uniq, compact } from 'lodash';

export const extractEntityIndexPatternsFromDefinitions = (
  entityDefinitionsSource: EntitySourceDefinition[]
) =>
  entityDefinitionsSource.reduce(
    (acc, { ['type_id']: typeId, index_patterns: indexPatterns }) => (
      (acc[typeId] = compact(uniq(concat(acc[typeId], indexPatterns)))), acc
    ),
    {} as Record<string, string[]>
  );

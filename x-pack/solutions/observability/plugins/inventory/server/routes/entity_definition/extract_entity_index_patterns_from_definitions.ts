/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitySourceDefinition } from '@kbn/entityManager-plugin/server/lib/v2/types';

export const extractEntityIndexPatternsFromDefinitions = (
  entityDefinitionsSource: EntitySourceDefinition[]
) =>
  entityDefinitionsSource.reduce(
    (acc, { ['type_id']: typeId }) => (
      (acc[typeId] = [
        ...new Set(
          entityDefinitionsSource
            .filter((sourceToFilter) => sourceToFilter.type_id === typeId)
            .flatMap((filteredSource) => filteredSource.index_patterns)
        ),
      ]),
      acc
    ),
    {} as Record<string, string[]>
  );

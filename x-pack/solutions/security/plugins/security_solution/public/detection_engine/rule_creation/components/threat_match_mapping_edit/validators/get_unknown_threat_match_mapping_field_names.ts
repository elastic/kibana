/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase } from '@kbn/es-query';
import type { ThreatMapping } from '../../../../../../common/api/detection_engine/model/rule_schema';

interface GetUnknownThreatMatchMappingFieldNamesParams {
  entries: ThreatMapping;
  indexPatterns: DataViewBase;
  threatIndexPatterns: DataViewBase;
}

interface GetUnknownThreatMatchMappingFieldNamesResult {
  unknownSourceIndicesFields: string[];
  unknownThreatMatchIndicesFields: string[];
}

export function getUnknownThreatMatchMappingFieldNames({
  entries,
  indexPatterns,
  threatIndexPatterns,
}: GetUnknownThreatMatchMappingFieldNamesParams): GetUnknownThreatMatchMappingFieldNamesResult {
  const knownIndexPatternsFields = new Set(indexPatterns.fields.map(({ name }) => name));
  const knownThreatMatchIndexPatternsFields = new Set(
    threatIndexPatterns.fields.map(({ name }) => name)
  );

  const unknownSourceIndicesFields: string[] = [];
  const unknownThreatMatchIndicesFields: string[] = [];

  for (const { entries: subEntries } of entries) {
    for (const subEntry of subEntries) {
      if (subEntry.field && !knownIndexPatternsFields.has(subEntry.field)) {
        unknownSourceIndicesFields.push(subEntry.field);
      }

      if (subEntry.value && !knownThreatMatchIndexPatternsFields.has(subEntry.value)) {
        unknownThreatMatchIndicesFields.push(subEntry.value);
      }
    }
  }

  return {
    unknownSourceIndicesFields,
    unknownThreatMatchIndicesFields,
  };
}

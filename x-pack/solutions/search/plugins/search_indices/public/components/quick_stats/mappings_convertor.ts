/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingPropertyBase } from '@elastic/elasticsearch/lib/api/types';
import type { Mappings } from '../../types';

export interface VectorFieldTypes {
  semantic_text: number;
  dense_vector: number;
  sparse_vector: number;
}

export function countVectorBasedTypesFromMappings(mappings: Mappings): VectorFieldTypes {
  const typeCounts: VectorFieldTypes = {
    semantic_text: 0,
    dense_vector: 0,
    sparse_vector: 0,
  };

  const typeCountKeys = Object.keys(typeCounts);

  function recursiveCount(fields: MappingProperty | Mappings | MappingPropertyBase['fields']) {
    if (!fields) {
      return;
    }
    if ('mappings' in fields) {
      recursiveCount(fields.mappings);
    }
    if ('properties' in fields && fields.properties) {
      Object.keys(fields.properties).forEach((key) => {
        const value = (fields.properties as Record<string, MappingProperty>)?.[key];

        if (value && value.type) {
          if (typeCountKeys.includes(value.type)) {
            const type = value.type as keyof VectorFieldTypes;
            typeCounts[type] = typeCounts[type] + 1;
          }

          if ('fields' in value) {
            recursiveCount(value.fields);
          }

          if ('properties' in value) {
            recursiveCount(value.properties);
          }
        } else if (value.properties || value.fields) {
          recursiveCount(value);
        }
      });
    }
  }

  recursiveCount(mappings);
  return typeCounts;
}

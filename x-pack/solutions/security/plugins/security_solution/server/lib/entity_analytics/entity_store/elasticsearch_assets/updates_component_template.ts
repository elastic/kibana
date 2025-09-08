/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  MappingProperty,
  MappingTypeMapping,
  PropertyName,
} from '@elastic/elasticsearch/lib/api/types';
import type { EntityEngineInstallationDescriptor, FieldDescription } from '../installation/types';

const DEFAULT_MAPPINGS: Record<PropertyName, MappingProperty> = {
  '@timestamp': {
    type: 'date',
  },
};

const FIELDS_TO_IGNORE = ['_index'];

const getComponentTemplateName = (definitionId: string) => `${definitionId}-updates@platform`;

export const createEntityUpdatesIndexComponentTemplate = (
  description: EntityEngineInstallationDescriptor,
  esClient: ElasticsearchClient
) => {
  return esClient.cluster.putComponentTemplate(buildUpdatesComponentTemplate(description));
};

export function buildUpdatesComponentTemplate(description: EntityEngineInstallationDescriptor) {
  return {
    name: getComponentTemplateName(description.id),
    template: {
      settings: {
        hidden: true,
      },
      mappings: buildMappings(description),
    },
  };
}

function buildMappings({
  fields,
  identityField,
  identityFieldMapping,
  entityType,
}: EntityEngineInstallationDescriptor): MappingTypeMapping {
  const properties: Record<PropertyName, MappingProperty> = {};
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (shouldMapField(field)) {
      properties[field.source] = field.mapping;
    }
  }

  properties[identityField] = identityFieldMapping;

  return {
    properties: { ...DEFAULT_MAPPINGS, ...properties },
  };
}

function shouldMapField(field: FieldDescription) {
  return FIELDS_TO_IGNORE.indexOf(field.source) < 0;
}

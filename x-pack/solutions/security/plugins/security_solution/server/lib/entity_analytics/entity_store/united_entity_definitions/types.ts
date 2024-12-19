/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '@kbn/entities-schema';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import type { FieldRetentionOperator } from '../field_retention_definition';

export type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

type EntityDefinitionMetadataElement = NonNullable<EntityDefinition['metadata']>[number];

export interface UnitedDefinitionField {
  field: string;
  retention_operator?: FieldRetentionOperator;
  mapping?: MappingProperty;
  definition?: EntityDefinitionMetadataElement;
}

export interface UnitedEntityDefinitionConfig {
  version: string;
  entityType: EntityType;
  fields: UnitedDefinitionField[];
}

export type UnitedDefinitionBuilder = (fieldHistoryLength: number) => UnitedEntityDefinitionConfig;

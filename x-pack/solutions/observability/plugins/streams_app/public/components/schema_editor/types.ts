/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldDefinitionConfig,
  FieldDefinitionConfigAdvancedParameters,
  WiredStreamDefinition,
} from '@kbn/streams-schema';

export type SchemaFieldStatus = 'inherited' | 'mapped' | 'unmapped';
export type SchemaFieldType = FieldDefinitionConfig['type'];

export interface BaseSchemaField extends Omit<FieldDefinitionConfig, 'type'> {
  name: string;
  parent: string;
  format?: string;
}

export interface MappedSchemaField extends BaseSchemaField {
  status: 'inherited' | 'mapped';
  type: SchemaFieldType;
  additionalParameters?: FieldDefinitionConfigAdvancedParameters;
}

export interface UnmappedSchemaField extends BaseSchemaField {
  status: 'unmapped';
  type?: SchemaFieldType;
  additionalParameters?: FieldDefinitionConfigAdvancedParameters;
}

export type SchemaField = MappedSchemaField | UnmappedSchemaField;

export interface SchemaEditorProps {
  fields: SchemaField[];
  isLoading?: boolean;
  onFieldUnmap: (fieldName: SchemaField['name']) => void;
  onFieldUpdate: (field: SchemaField) => void;
  onRefreshData?: () => void;
  stream: WiredStreamDefinition;
  withControls?: boolean;
  withFieldSimulation?: boolean;
  withTableActions?: boolean;
}

export const isSchemaFieldTyped = (field: SchemaField): field is MappedSchemaField => {
  return !!field && !!field.name && !!field.type;
};

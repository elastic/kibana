/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinitionConfig, WiredStreamDefinition } from '@kbn/streams-schema';

export type SchemaFieldStatus = 'inherited' | 'mapped' | 'unmapped';
export type SchemaFieldType = FieldDefinitionConfig['type'];

export interface BaseSchemaField extends Omit<FieldDefinitionConfig, 'type'> {
  name: string;
  parent: string;
}

export interface MappedSchemaField extends BaseSchemaField {
  status: 'inherited' | 'mapped';
  type: SchemaFieldType;
}

export interface UnmappedSchemaField extends BaseSchemaField {
  status: 'unmapped';
}

export type SchemaField = MappedSchemaField | UnmappedSchemaField;

export interface SchemaEditorProps {
  fields: SchemaField[];
  isLoading?: boolean;
  onFieldUnmap: (fieldName: SchemaField['name']) => void;
  onFieldUpdate: (field: SchemaField) => void;
  stream: WiredStreamDefinition;
  withControls?: boolean;
  withTableActions?: boolean;
}

export const isMappedSchemaField = (field: SchemaField): field is MappedSchemaField => {
  return field.status !== 'unmapped';
};

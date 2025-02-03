/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinitionConfig, WiredStreamDefinition } from '@kbn/streams-schema';

export type SchemaFieldStatus = 'inherited' | 'mapped' | 'unmapped';

export interface SchemaField extends Omit<FieldDefinitionConfig, 'type'> {
  name: string;
  parent: string;
  status: SchemaFieldStatus;
  type?: FieldDefinitionConfig['type'];
}

export interface SchemaEditorProps {
  fields: SchemaField[];
  isLoading?: boolean;
  stream: WiredStreamDefinition;
  withControls?: boolean;
  withTableActions?: boolean;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Field } from '../../../common/types';

export interface MappingsOptionData {
  name: string;
}

export interface FieldMeta {
  childFieldsName?: ChildFieldName;
  hasChildFields: boolean;
  childFields?: string[];
}

export interface NormalizedFields {
  byId: {
    [id: string]: NormalizedField;
  };
  rootLevelFields: string[];
  aliases: { [key: string]: string[] };
}

export interface NormalizedField extends FieldMeta {
  id: string;
  parentId?: string;
  path: string[];
  source: Omit<Field, 'properties' | 'fields'>;
}

export type ChildFieldName = 'properties' | 'fields';

export interface MappingNode {
  type?: 'semantic_text' | 'object';
  inference_id?: string;
  properties?: Record<string, MappingNode>;
}

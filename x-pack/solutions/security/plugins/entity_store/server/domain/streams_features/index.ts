/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createKnowledgeIndicatorsReader } from './knowledge_indicators_reader_factory';
export {
  ECS_IDENTITY_FIELD_SET,
  loadStreamSchemaAliases,
  validateAliasTable,
} from './load_stream_schema_aliases';
export type {
  AliasMap,
  EcsIdentityField,
  LoadStreamSchemaAliasesOptions,
  StreamAliasContext,
} from './load_stream_schema_aliases';

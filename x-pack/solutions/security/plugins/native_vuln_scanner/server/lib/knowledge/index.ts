/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  advisoryKnowledgeId,
  cveKnowledgeId,
  KNOWLEDGE_CAPS,
  KNOWLEDGE_INDEX,
  KNOWLEDGE_LICENSES,
  releaseToken,
} from './constants';
export type { KnowledgeDoc, KnowledgeDocContext } from './knowledge_doc';
export { toKnowledgeDoc } from './knowledge_doc';
export { ensureKnowledgeIndex } from './index_setup';
export { knowledgeMappings } from './mappings';
export type { KnowledgeWriteResult, WriteKnowledgeParams } from './writer';
export { writeKnowledge } from './writer';

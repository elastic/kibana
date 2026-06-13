/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createKnowledgeIndicatorsReader,
  createKnowledgeIndicatorsReaderFromStreamsStart,
} from './knowledge_indicators_reader_factory';
export { loadEntityResolutionClues, parseIdentityLinkClue } from './load_entity_resolution_clues';
export type {
  IdentityLinkClue,
  LoadEntityResolutionCluesOptions,
} from './load_entity_resolution_clues';
export { loadIdentityLinkRules, parseIdentityLinkRule } from './load_identity_link_rules';
export type { IdentityLinkRule, LoadIdentityLinkRulesOptions } from './load_identity_link_rules';
export {
  extractIdentityLinkClues,
  buildIdentityLinkExtractionEsql,
  stripIdentityFieldConditions,
} from './extract_identity_links';
export type { ExtractIdentityLinkCluesDeps } from './extract_identity_links';

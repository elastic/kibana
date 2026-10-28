/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getAnonymizedAlerts } from './default_attack_discovery_graph';

export type {
  DefaultAttackDiscoveryGraph,
  GetDefaultAttackDiscoveryGraphParams,
} from './default_attack_discovery_graph';
export { getDefaultAttackDiscoveryGraph } from './default_attack_discovery_graph';

export type {
  AttackDiscoveryPrompts,
  CombinedPrompts,
  GenerationPrompts,
} from './default_attack_discovery_graph/prompts';
export { getCombinedAttackDiscoveryPrompt } from './default_attack_discovery_graph/prompts';
export { getAttackDiscoveriesGenerationSchema } from './default_attack_discovery_graph/schemas';

export {
  ATTACK_DISCOVERY_GRAPH_RUN_NAME,
  ATTACK_DISCOVERY_TAG,
} from './default_attack_discovery_graph/constants';

export type {
  AttackDiscoveryGraphResult,
  InvokeAttackDiscoveryGraphWithDocs,
  InvokeAttackDiscoveryGraphWithDocsParams,
} from './invoke_attack_discovery_graph';

export {
  ATTACK_DISCOVERY_TEMPLATE_ID,
  ATTACK_DISCOVERY_TEMPLATE_VERSION,
  attackDiscoveryRefineTemplateRequest,
  attackDiscoveryTemplateOmissionMessage,
  capAttackDiscoveryTemplateCount,
  createAttackDiscoveryTemplateCompletion,
  resolveAttackDiscoveryTemplateCompletion,
} from './template_completion';
export type {
  AttackDiscoveryTemplateCompletion,
  AttackDiscoveryTemplatePhase,
  AttackDiscoveryTemplateRequest,
} from './template_completion';

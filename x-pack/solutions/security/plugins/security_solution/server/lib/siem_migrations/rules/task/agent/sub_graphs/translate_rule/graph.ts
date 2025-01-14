/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { isEmpty } from 'lodash/fp';
import { RuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import { getEcsMappingNode } from './nodes/ecs_mapping';
import { translationResultNode } from './nodes/translation_result';
import { getFixQueryErrorsNode } from './nodes/fix_query_errors';
import { getRetrieveIntegrationsNode } from './nodes/retrieve_integrations';
import { getTranslateRuleNode } from './nodes/translate_rule';
import { getValidationNode } from './nodes/validation';
import { getInlineQueryNode } from './nodes/inline_query';
import { translateRuleState } from './state';
import type { TranslateRuleGraphParams, TranslateRuleState } from './types';

// How many times we will try to self-heal when validation fails, to prevent infinite graph recursions
const MAX_VALIDATION_ITERATIONS = 3;

export function getTranslateRuleGraph({
  model,
  inferenceClient,
  connectorId,
  ruleMigrationsRetriever,
  logger,
}: TranslateRuleGraphParams) {
  const translateRuleNode = getTranslateRuleNode({
    inferenceClient,
    connectorId,
    logger,
  });
  const inlineQueryNode = getInlineQueryNode({ model, ruleMigrationsRetriever });
  const validationNode = getValidationNode({ logger });
  const fixQueryErrorsNode = getFixQueryErrorsNode({ inferenceClient, connectorId, logger });
  const retrieveIntegrationsNode = getRetrieveIntegrationsNode({ model, ruleMigrationsRetriever });
  const ecsMappingNode = getEcsMappingNode({ inferenceClient, connectorId, logger });

  const translateRuleGraph = new StateGraph(translateRuleState)
    // Nodes
    .addNode('inlineQuery', inlineQueryNode)
    .addNode('retrieveIntegrations', retrieveIntegrationsNode)
    .addNode('translateRule', translateRuleNode)
    .addNode('validation', validationNode)
    .addNode('fixQueryErrors', fixQueryErrorsNode)
    .addNode('ecsMapping', ecsMappingNode)
    .addNode('translationResult', translationResultNode)
    // Edges
    .addEdge(START, 'inlineQuery')
    .addConditionalEdges('inlineQuery', translatableRouter, [
      'retrieveIntegrations',
      'translationResult',
    ])
    .addEdge('retrieveIntegrations', 'translateRule')
    .addEdge('translateRule', 'validation')
    .addEdge('fixQueryErrors', 'validation')
    .addEdge('ecsMapping', 'validation')
    .addConditionalEdges('validation', validationRouter, [
      'fixQueryErrors',
      'ecsMapping',
      'translationResult',
    ])
    .addEdge('translationResult', END);

  const graph = translateRuleGraph.compile();
  graph.name = 'Translate Rule Graph';
  return graph;
}

const translatableRouter = (state: TranslateRuleState) => {
  if (!state.inline_query) {
    return 'translationResult';
  }
  return 'retrieveIntegrations';
};

const validationRouter = (state: TranslateRuleState) => {
  if (
    state.validation_errors.iterations <= MAX_VALIDATION_ITERATIONS &&
    state.translation_result === RuleTranslationResult.FULL
  ) {
    if (!isEmpty(state.validation_errors?.esql_errors)) {
      return 'fixQueryErrors';
    }
    if (!state.translation_finalized) {
      return 'ecsMapping';
    }
  }
  return 'translationResult';
};

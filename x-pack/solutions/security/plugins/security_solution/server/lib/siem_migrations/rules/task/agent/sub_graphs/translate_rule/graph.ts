/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { isEmpty } from 'lodash/fp';
import { getEcsMappingNode } from './nodes/ecs_mapping';
import { getFixQueryErrorsNode } from './nodes/fix_query_errors';
import { getInlineQueryNode } from './nodes/inline_query';
import { getRetrieveIntegrationsNode } from './nodes/retrieve_integrations';
import { getTranslateRuleNode } from './nodes/translate_rule';
import { getTranslationResultNode } from './nodes/translation_result';
import { getValidationNode } from './nodes/validation';
import { translateRuleState } from './state';
import type { TranslateRuleGraphParams, TranslateRuleState } from './types';

// How many times we will try to self-heal when validation fails, to prevent infinite graph recursions
const MAX_VALIDATION_ITERATIONS = 3;

export function getTranslateRuleGraph({
  model,
  esqlKnowledgeBase,
  ruleMigrationsRetriever,
  logger,
  telemetryClient,
}: TranslateRuleGraphParams) {
  const translateRuleNode = getTranslateRuleNode({
    esqlKnowledgeBase,
    logger,
  });
  const translationResultNode = getTranslationResultNode();
  const inlineQueryNode = getInlineQueryNode({ model, ruleMigrationsRetriever });
  const validationNode = getValidationNode({ logger });
  const fixQueryErrorsNode = getFixQueryErrorsNode({ esqlKnowledgeBase, logger });
  const retrieveIntegrationsNode = getRetrieveIntegrationsNode({
    model,
    ruleMigrationsRetriever,
    telemetryClient,
  });
  const ecsMappingNode = getEcsMappingNode({ esqlKnowledgeBase, logger });

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
    !isEmpty(state.validation_errors?.esql_errors)
  ) {
    return 'fixQueryErrors';
  }
  if (!state.includes_ecs_mapping) {
    return 'ecsMapping';
  }

  return 'translationResult';
};

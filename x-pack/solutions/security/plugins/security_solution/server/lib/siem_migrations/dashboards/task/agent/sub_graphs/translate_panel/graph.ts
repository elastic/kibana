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
import { getTranslateQueryNode } from './nodes/translate_query';
import { getTranslationResultNode } from './nodes/translation_result';
import { getValidationNode } from './nodes/validation';
import { translateDashboardPanelState } from './state';
import type { TranslatePanelGraphParams, TranslateDashboardPanelState } from './types';
import { migrateDashboardConfigSchema } from '../../state';
import { getSelectIndexPatternNode } from './nodes/select_index_pattern/select_index_pattern';

// How many times we will try to self-heal when validation fails, to prevent infinite graph recursions
const MAX_VALIDATION_ITERATIONS = 3;

export function getTranslatePanelGraph({
  model,
  esqlKnowledgeBase,
  logger,
  telemetryClient,
}: TranslatePanelGraphParams) {
  const translateQueryNode = getTranslateQueryNode({
    esqlKnowledgeBase,
    logger,
  });
  const inlineQueryNode = getInlineQueryNode({ model, logger });
  const validationNode = getValidationNode({ logger });
  const fixQueryErrorsNode = getFixQueryErrorsNode({ esqlKnowledgeBase, logger });
  const ecsMappingNode = getEcsMappingNode({ esqlKnowledgeBase, logger });
  const selectIndexPatternNode = getSelectIndexPatternNode({ model, telemetryClient, logger });
  const translationResultNode = getTranslationResultNode();

  const translateDashboardPanelGraph = new StateGraph(
    translateDashboardPanelState,
    migrateDashboardConfigSchema
  )
    // Nodes
    .addNode('inlineQuery', inlineQueryNode)
    .addNode('translateQuery', translateQueryNode)
    .addNode('validation', validationNode)
    .addNode('fixQueryErrors', fixQueryErrorsNode)
    .addNode('ecsMapping', ecsMappingNode)
    .addNode('selectIndexPattern', selectIndexPatternNode)
    .addNode('translationResult', translationResultNode)
    // Edges
    .addEdge(START, 'inlineQuery')
    .addEdge('inlineQuery', 'translateQuery')
    .addEdge('translateQuery', 'validation')
    .addEdge('fixQueryErrors', 'validation')
    .addEdge('ecsMapping', 'validation')
    .addConditionalEdges('validation', validationRouter, [
      'fixQueryErrors',
      'ecsMapping',
      'selectIndexPattern',
    ])
    .addEdge('selectIndexPattern', 'translationResult')
    .addEdge('translationResult', END);

  const graph = translateDashboardPanelGraph.compile();
  graph.name = 'Translate Dashboard Panel Graph';
  return graph;
}

const validationRouter = (state: TranslateDashboardPanelState) => {
  if (
    state.validation_errors.iterations <= MAX_VALIDATION_ITERATIONS &&
    !isEmpty(state.validation_errors?.esql_errors)
  ) {
    return 'fixQueryErrors';
  }
  if (!state.includes_ecs_mapping) {
    return 'ecsMapping';
  }

  return 'selectIndexPattern';
};

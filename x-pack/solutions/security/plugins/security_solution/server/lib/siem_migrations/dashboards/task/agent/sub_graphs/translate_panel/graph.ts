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

export function getTranslatePanelGraph(params: TranslatePanelGraphParams) {
  const translateQueryNode = getTranslateQueryNode(params);
  const inlineQueryNode = getInlineQueryNode(params);
  const validationNode = getValidationNode(params);
  const fixQueryErrorsNode = getFixQueryErrorsNode(params);
  const ecsMappingNode = getEcsMappingNode(params);
  const selectIndexPatternNode = getSelectIndexPatternNode(params);
  const translationResultNode = getTranslationResultNode();

  const translateDashboardPanelGraph = new StateGraph(
    translateDashboardPanelState,
    migrateDashboardConfigSchema
  )
    // Nodes
    .addNode('inlineQuery', inlineQueryNode)
    // TODO: .addNode('createDescription', createDescriptionNode) -> ask the LLM to create a description of the panel
    .addNode('selectIndexPattern', selectIndexPatternNode)

    // Consider this block by the entire Assistant nlToEsql graph
    .addNode('translateQuery', translateQueryNode)
    .addNode('validation', validationNode)
    .addNode('fixQueryErrors', fixQueryErrorsNode)
    .addNode('ecsMapping', ecsMappingNode) // Not sure about this one, maybe we should keep it anyway, tests need to be done
    // Consider this block by the entire Assistant nlToEsql graph

    .addNode('translationResult', translationResultNode)

    // Edges
    .addEdge(START, 'inlineQuery')
    // .addEdge('inlineQuery', 'createDescription') // createDescription would go after inlineQuery
    .addEdge('inlineQuery', 'selectIndexPattern')
    // .addEdge('createDescription', 'selectIndexPattern') // And before selectIndexPattern, the description is sent to the selectIndexPattern graph
    .addEdge('selectIndexPattern', 'translateQuery')
    .addEdge('translateQuery', 'validation')
    .addEdge('fixQueryErrors', 'validation')
    .addEdge('ecsMapping', 'validation')
    .addConditionalEdges('validation', validationRouter, [
      'fixQueryErrors',
      'ecsMapping',
      'translationResult',
    ])
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

  return 'translationResult';
};

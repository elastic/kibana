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
import { getSelectIndexPatternNode } from './nodes/select_index_pattern';
import { RETRY_POLICY } from '../../constants';
import { getExtractColumnsFromEsqlQueryNode } from './nodes/extract_columns';
import { getIndexMappingNode as createGetIndexMappingNode } from './nodes/get_index_mapping';
import { getCorrectColumnsFromMappingNode } from './nodes/correct_columns_from_mapping';

export function getTranslatePanelGraph(params: TranslatePanelGraphParams) {
  const translateQueryNode = getTranslateQueryNode(params);
  const inlineQueryNode = getInlineQueryNode(params);
  const validationNode = getValidationNode(params);
  const fixQueryErrorsNode = getFixQueryErrorsNode(params);
  const ecsMappingNode = getEcsMappingNode(params);
  const extractColumnsFromEsqlNode = getExtractColumnsFromEsqlQueryNode(params);
  const selectIndexPatternNode = getSelectIndexPatternNode(params);
  const translationResultNode = getTranslationResultNode(params);
  const correctColumnsFromMappingNode = getCorrectColumnsFromMappingNode({
    esqlKnowledgeBase: params.esqlKnowledgeBase,
    logger: params.logger,
  });
  const getIndexMappingNodeInstance = createGetIndexMappingNode(params);

  const translateDashboardPanelGraph = new StateGraph(
    translateDashboardPanelState,
    migrateDashboardConfigSchema
  )
    // Nodes
    .addNode('inlineQuery', inlineQueryNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('getIndexMapping', getIndexMappingNodeInstance)
    .addNode('translateQuery', translateQueryNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('validation', validationNode)
    .addNode('fixQueryErrors', fixQueryErrorsNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('ecsMapping', ecsMappingNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('extractColumnsFromEsql', extractColumnsFromEsqlNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('correctColumnsFromMapping', correctColumnsFromMappingNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('selectIndexPattern', selectIndexPatternNode)
    .addNode('translationResult', translationResultNode)

    // Edges
    .addConditionalEdges(START, panelTypeRouter, {
      isMarkdown: 'translationResult',
      isNotMarkdown: 'inlineQuery',
    })
    .addConditionalEdges('inlineQuery', translatableRouter, ['translateQuery', 'translationResult'])
    .addEdge('translateQuery', 'validation')
    .addEdge('fixQueryErrors', 'validation')
    .addEdge('ecsMapping', 'validation')
    .addConditionalEdges('validation', validationRouter, [
      'fixQueryErrors',
      'ecsMapping',
      'selectIndexPattern',
    ])
    .addEdge('selectIndexPattern', 'getIndexMapping')
    .addEdge('getIndexMapping', 'correctColumnsFromMapping')
    .addEdge('correctColumnsFromMapping', 'extractColumnsFromEsql')
    .addEdge('extractColumnsFromEsql', 'translationResult')
    .addEdge('translationResult', END);

  const graph = translateDashboardPanelGraph.compile();
  graph.name = 'Translate Dashboard Panel Graph';
  return graph;
}

const translatableRouter = (state: TranslateDashboardPanelState) => {
  if (!state.inline_query) {
    return 'translationResult';
  }
  return 'translateQuery';
};

const validationRouter = (state: TranslateDashboardPanelState) => {
  if (state.validation_errors.retries_left > 0 && !isEmpty(state.validation_errors?.esql_errors)) {
    return 'fixQueryErrors';
  }
  if (!state.includes_ecs_mapping) {
    return 'ecsMapping';
  }
  return 'selectIndexPattern';
};

const panelTypeRouter = (state: TranslateDashboardPanelState) => {
  if (state.parsed_panel.viz_type === 'markdown') {
    return 'isMarkdown';
  }
  return 'isNotMarkdown';
};

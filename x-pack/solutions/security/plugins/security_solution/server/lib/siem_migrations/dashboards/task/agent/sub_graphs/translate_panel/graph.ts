/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { isEmpty } from 'lodash/fp';
import { hasValidIndexPattern } from '../../helpers/has_valid_index_pattern';
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
import { getSampleIndexRecordsNode } from './nodes/sample_index_records';

export function getTranslatePanelGraph(params: TranslatePanelGraphParams) {
  const inlineQueryNode = getInlineQueryNode(params);
  const selectIndexPatternNode = getSelectIndexPatternNode(params);
  const sampleIndexRecordsNode = getSampleIndexRecordsNode(params);
  const translateQueryNode = getTranslateQueryNode(params);
  const validationNode = getValidationNode(params);
  const fixQueryErrorsNode = getFixQueryErrorsNode(params);
  const ecsMappingNode = getEcsMappingNode(params);
  const extractColumnsFromEsqlNode = getExtractColumnsFromEsqlQueryNode(params);
  const translationResultNode = getTranslationResultNode(params);

  const translateDashboardPanelGraph = new StateGraph(
    translateDashboardPanelState,
    migrateDashboardConfigSchema
  )
    // Nodes
    .addNode('inlineQuery', inlineQueryNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('selectIndexPattern', selectIndexPatternNode)
    .addNode('sampleIndexRecords', sampleIndexRecordsNode)
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
    .addNode('translationResult', translationResultNode)

    // Edges
    .addConditionalEdges(START, panelTypeRouter, {
      isMarkdown: 'translationResult',
      isNotMarkdown: 'inlineQuery',
    })
    .addConditionalEdges('inlineQuery', translatableRouter, [
      'selectIndexPattern',
      'translationResult',
    ])
    .addConditionalEdges('selectIndexPattern', indexFoundRouter, [
      'sampleIndexRecords',
      'translateQuery',
    ])
    .addEdge('sampleIndexRecords', 'translateQuery')
    .addEdge('translateQuery', 'validation')
    .addEdge('fixQueryErrors', 'validation')
    .addEdge('ecsMapping', 'validation')
    .addConditionalEdges('validation', validationRouter, [
      'fixQueryErrors',
      'ecsMapping',
      'extractColumnsFromEsql',
    ])
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
  return 'selectIndexPattern';
};

const indexFoundRouter = (state: TranslateDashboardPanelState) => {
  if (!hasValidIndexPattern(state.index_pattern)) {
    return 'translateQuery';
  }
  return 'sampleIndexRecords';
};

const validationRouter = (state: TranslateDashboardPanelState) => {
  if (state.validation_errors.retries_left > 0 && !isEmpty(state.validation_errors?.esql_errors)) {
    return 'fixQueryErrors';
  }
  if (!state.includes_ecs_mapping && !state.resolved_resource) {
    return 'ecsMapping';
  }
  return 'extractColumnsFromEsql';
};

const panelTypeRouter = (state: TranslateDashboardPanelState) => {
  if (state.parsed_panel.viz_type === 'markdown') {
    return 'isMarkdown';
  }
  return 'isNotMarkdown';
};

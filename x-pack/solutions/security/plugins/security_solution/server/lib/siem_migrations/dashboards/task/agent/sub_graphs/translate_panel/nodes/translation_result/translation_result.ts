/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { generateAssistantComment } from '../../../../../../../common/task/util/comments';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { MigrationTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';
import { createMarkdownPanel } from '../../../../helpers/markdown_panel/create_markdown_panel';
import { buildDashboardPanelForVizType, savedDashboardRowToDashboardPanel } from './panel_builders';

interface GetTranslationResultNodeParams {
  logger: Logger;
}

export const getTranslationResultNode = (params: GetTranslationResultNodeParams): GraphNode => {
  return async (state) => {
    if (state.parsed_panel.viz_type === 'markdown') {
      const legacyMarkdown = createMarkdownPanel(state.parsed_panel.query, state.parsed_panel);
      const dashboardPanel = savedDashboardRowToDashboardPanel(legacyMarkdown);

      return {
        elastic_panel: dashboardPanel,
        comments: [
          generateAssistantComment(
            `Successfully translated Markdown Panel: <b>${state.parsed_panel.title}</b>`
          ),
        ],
        translation_result: MigrationTranslationResult.FULL,
      };
    }
    const query = state.esql_query;
    if (!query) {
      const message = 'SPL query unsupported or missing, cannot translate panel';
      const legacyMarkdown = createMarkdownPanel(message, state.parsed_panel);
      const dashboardPanel = savedDashboardRowToDashboardPanel(legacyMarkdown);
      return {
        elastic_panel: dashboardPanel,
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      };
    }

    let translationResult;
    if (query.startsWith(`FROM ${MISSING_INDEX_PATTERN_PLACEHOLDER}`)) {
      translationResult = MigrationTranslationResult.PARTIAL;
    } else if (state.validation_errors?.esql_errors) {
      translationResult = MigrationTranslationResult.PARTIAL;
    } else if (query.match(/\[(macro|lookup):.*?\]/)) {
      translationResult = MigrationTranslationResult.PARTIAL;
    } else {
      translationResult = MigrationTranslationResult.FULL;
    }

    const vizType = state.parsed_panel?.viz_type;
    try {
      if (!vizType) {
        throw new Error('Panel visualization type could not be extracted');
      }
      const dashboardPanel = buildDashboardPanelForVizType(
        vizType,
        query,
        state.esql_query_columns ?? [],
        state.parsed_panel
      );

      return {
        elastic_panel: dashboardPanel,
        translation_result: translationResult,
      };
    } catch (error) {
      params.logger.error(`Error building visualization panel: ${error}`);
      return {
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
        comments: [generateAssistantComment(`Error building visualization panel: ${error}`)],
      };
    }
  };
};

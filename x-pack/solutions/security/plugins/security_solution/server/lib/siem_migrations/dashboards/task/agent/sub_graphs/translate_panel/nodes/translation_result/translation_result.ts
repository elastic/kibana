/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Logger } from '@kbn/core/server';
import { generateAssistantComment } from '../../../../../../../common/task/util/comments';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { MigrationTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';
import { processPanel } from './process_panel';
import { createMarkdownPanel } from '../../../../helpers/markdown_panel/create_markdown_panel';

interface GetTranslationResultNodeParams {
  logger: Logger;
}

export const getTranslationResultNode = (params: GetTranslationResultNodeParams): GraphNode => {
  return async (state) => {
    const query = state.esql_query;
    if (!query) {
      const message = 'SPL query unsupported or missing, cannot translate panel';
      const panelJSON = createMarkdownPanel(message, state.parsed_panel);
      return {
        elastic_panel: panelJSON,
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
    let panel: object;
    try {
      if (!vizType) {
        throw new Error('Panel visualization type could not be extracted');
      }
      panel = readVisualizationTemplate(vizType);
    } catch (error) {
      params.logger.error(`Error retrieving visualization template: ${error}`);
      return {
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
        comments: [generateAssistantComment(`Error retrieving visualization template: ${error}`)],
      };
    }

    const panelJSON = processPanel(
      panel,
      query,
      state.esql_query_columns ?? [],
      state.parsed_panel
    );

    return {
      elastic_panel: panelJSON,
      translation_result: translationResult,
    };
  };
};

function readVisualizationTemplate(vizType: string): object {
  const templatePath = path.join(__dirname, `./templates/${vizType}.viz.json`);
  const template = fs.readFileSync(templatePath, 'utf-8');
  if (!template) {
    throw new Error(`Template not found for visualization type "${vizType}"`);
  }
  return JSON.parse(template);
}

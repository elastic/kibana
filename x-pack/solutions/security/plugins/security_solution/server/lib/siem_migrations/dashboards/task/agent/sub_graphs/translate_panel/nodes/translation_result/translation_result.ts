/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { MigrationTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';
import { processPanel } from './process_panel';

export const getTranslationResultNode = (): GraphNode => {
  return async (state) => {
    const query = state.esql_query;
    if (!query) {
      return { translation_result: MigrationTranslationResult.UNTRANSLATABLE };
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

      const templatePath = path.join(__dirname, `./templates/${vizType}.viz.json`);
      const template = fs.readFileSync(templatePath, 'utf-8');

      if (!template) {
        throw new Error(`Template not found for visualization type: ${vizType}`);
      }
      panel = JSON.parse(template);
    } catch (error) {
      // TODO: log the error
      return {
        // TODO: add comment: "panel chart type not supported"
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      };
    }

    const panelJSON = processPanel(panel, query, state.parsed_panel);

    return {
      elastic_panel: panelJSON,
      translation_result: translationResult,
    };
  };
};

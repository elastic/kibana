/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getESQLAdHocDataviewId, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { generateAssistantComment } from '../../../../../../../common/task/util/comments';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { TRANSLATION_INDEX_PATTERN } from '../../../../constants';
import { hasValidIndexPattern } from '../../../../helpers/has_valid_index_pattern';
import { MigrationTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';
import { processPanel, type PanelDataViewIdentity } from './process_panel';
import { createMarkdownPanel } from '../../../../helpers/markdown_panel/create_markdown_panel';

const ES_TIMESTAMP_FIELD_NAME = '@timestamp';

interface GetTranslationResultNodeParams {
  logger: Logger;
  esScopedClient?: { asCurrentUser: ElasticsearchClient };
}

export const getTranslationResultNode = (params: GetTranslationResultNodeParams): GraphNode => {
  return async (state) => {
    if (state.parsed_panel.viz_type === 'markdown') {
      const panelJSON = createMarkdownPanel(state.parsed_panel.query, state.parsed_panel);

      return {
        elastic_panel: panelJSON,
        comments: [
          generateAssistantComment(
            `Successfully translated Markdown Panel: <b>${state.parsed_panel.title}</b>`
          ),
        ],
        translation_result: MigrationTranslationResult.FULL,
      };
    }
    const rawQuery = state.esql_query;
    if (!rawQuery) {
      const message = 'SPL query unsupported or missing, cannot translate panel';
      const panelJSON = createMarkdownPanel(message, state.parsed_panel);
      return {
        elastic_panel: panelJSON,
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      };
    }

    const query = !hasValidIndexPattern(state.index_pattern)
      ? rawQuery.replaceAll(TRANSLATION_INDEX_PATTERN, MISSING_INDEX_PATTERN_PLACEHOLDER)
      : rawQuery;

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

    const dataView = await resolvePanelDataView(query, state.index_pattern, params);

    const panelJSON = processPanel(
      panel,
      query,
      state.esql_query_columns ?? [],
      state.parsed_panel,
      dataView
    );

    return {
      elastic_panel: panelJSON,
      translation_result: translationResult,
      comments: [generateAssistantComment(`## Final ES|QL Query\n\n\`\`\`esql\n${query}\n\`\`\``)],
    };
  };
};

async function resolvePanelDataView(
  query: string,
  selectedIndexPattern: string | undefined,
  params: GetTranslationResultNodeParams
): Promise<PanelDataViewIdentity | undefined> {
  const indexPattern = getIndexPatternFromESQLQuery(query);
  if (!indexPattern) {
    return undefined;
  }

  const timeFieldName = hasValidIndexPattern(selectedIndexPattern)
    ? await resolveTimestampField(params.esScopedClient?.asCurrentUser, indexPattern, params.logger)
    : undefined;

  return {
    id: await getESQLAdHocDataviewId({
      indexPattern,
      timeFieldName,
      projectRouting: undefined,
    }),
    timeFieldName,
  };
}

async function resolveTimestampField(
  esClient: ElasticsearchClient | undefined,
  indexPattern: string,
  logger: Logger
): Promise<string | undefined> {
  if (!esClient) {
    return undefined;
  }

  try {
    const response = await esClient.fieldCaps({
      index: indexPattern,
      fields: ES_TIMESTAMP_FIELD_NAME,
      include_unmapped: false,
    });
    if (response.fields && response.fields[ES_TIMESTAMP_FIELD_NAME]) {
      return ES_TIMESTAMP_FIELD_NAME;
    }
    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      `Failed to resolve @timestamp for migrated dashboard data view "${indexPattern}": ${message}`
    );
    return undefined;
  }
}

function readVisualizationTemplate(vizType: string): object {
  const templatePath = path.join(__dirname, `./templates/${vizType}.viz.json`);
  const template = fs.readFileSync(templatePath, 'utf-8');
  if (!template) {
    throw new Error(`Template not found for visualization type "${vizType}"`);
  }
  return JSON.parse(template);
}

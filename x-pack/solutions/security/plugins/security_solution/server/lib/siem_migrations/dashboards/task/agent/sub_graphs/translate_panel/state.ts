/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { MigrationComments } from '../../../../../../../../common/siem_migrations/model/common.gen';
import type { ParsedPanel } from '../../../../../../../../common/siem_migrations/parsers/types';
import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { MigrationResources } from '../../../../../common/task/retrievers/resource_retriever';
import type { EsqlColumn, ValidationErrors } from './types';

export const translateDashboardPanelState = Annotation.Root({
  parsed_panel: Annotation<ParsedPanel>(),
  description: Annotation<string>(),
  dashboard_description: Annotation<string>(),
  resources: Annotation<MigrationResources>(),
  elastic_panel: Annotation<object | undefined>(), // The visualization panel object
  index_pattern: Annotation<string | undefined>(),
  includes_ecs_mapping: Annotation<boolean>({
    reducer: (current, value) => value ?? current,
    default: () => false,
  }),
  inline_query: Annotation<string | undefined>(),
  esql_query: Annotation<string | undefined>(),
  esql_query_columns: Annotation<EsqlColumn[] | undefined>(),
  validation_errors: Annotation<ValidationErrors>({
    reducer: (current, value) => value ?? current,
    default: () => ({ retries_left: 3 }), // Max self-healing ES|QL validation retries
  }),
  translation_result: Annotation<MigrationTranslationResult>({
    reducer: (current, value) => value ?? current,
    default: () => MigrationTranslationResult.UNTRANSLATABLE,
  }),
  comments: Annotation<MigrationComments>({
    reducer: (current, value) => (value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
});

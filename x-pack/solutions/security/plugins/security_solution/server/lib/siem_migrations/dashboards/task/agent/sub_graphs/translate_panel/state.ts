/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { DashboardMigrationDashboard } from '../../../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { MigrationResources } from '../../../../../common/task/retrievers/resource_retriever';
import type { ValidationErrors } from './types';
import type { ParsedPanel } from '../../../../lib/parsers/types';

export const translateDashboardPanelState = Annotation.Root({
  parsed_panel: Annotation<ParsedPanel>(),
  elastic_panel: Annotation<object>(), // The visualization panel object
  index_pattern: Annotation<string>(),
  resources: Annotation<MigrationResources>(),
  includes_ecs_mapping: Annotation<boolean>({
    reducer: (current, value) => value ?? current,
    default: () => false,
  }),
  inline_query: Annotation<string>(),
  description: Annotation<string>(),
  esql_query: Annotation<string>(),
  validation_errors: Annotation<ValidationErrors>({
    reducer: (current, value) => value ?? current,
    default: () => ({ iterations: 0 }),
  }),
  translation_result: Annotation<MigrationTranslationResult>({
    reducer: (current, value) => value ?? current,
    default: () => MigrationTranslationResult.UNTRANSLATABLE,
  }),
  comments: Annotation<DashboardMigrationDashboard['comments']>({
    reducer: (current, value) => (value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
});

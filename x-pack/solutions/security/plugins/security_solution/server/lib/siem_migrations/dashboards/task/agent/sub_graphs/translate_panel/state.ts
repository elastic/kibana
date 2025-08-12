/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import { RuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { DashboardMigrationDashboard } from '../../../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { MigrationResources } from '../../../../../common/task/retrievers/resource_retriever';
import type { ValidationErrors } from './types';
import type { ParsedOriginalPanel, ElasticPanel } from '../../types';

export const translateDashboardPanelState = Annotation.Root({
  original_panel: Annotation<ParsedOriginalPanel>(),
  elastic_panel: Annotation<ElasticPanel>({
    reducer: (current, value) => ({ ...current, ...value }),
  }),
  index_pattern: Annotation<string>,
  resources: Annotation<MigrationResources>(),
  includes_ecs_mapping: Annotation<boolean>({
    reducer: (current, value) => value ?? current,
    default: () => false,
  }),
  inline_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  validation_errors: Annotation<ValidationErrors>({
    reducer: (current, value) => value ?? current,
    default: () => ({ iterations: 0 }),
  }),
  translation_result: Annotation<RuleTranslationResult>({
    reducer: (current, value) => value ?? current,
    default: () => RuleTranslationResult.UNTRANSLATABLE,
  }),
  comments: Annotation<DashboardMigrationDashboard['comments']>({
    reducer: (current, value) => (value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
});

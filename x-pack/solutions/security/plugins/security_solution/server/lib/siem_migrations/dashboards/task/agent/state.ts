/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import { uniq } from 'lodash/fp';
import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type {
  ElasticDashboard,
  OriginalDashboard,
  DashboardMigrationDashboard,
} from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { MigrationResources } from '../../../common/task/retrievers/resource_retriever';
import type { FailedPanelTranslations, ParsedOriginalDashboard, TranslatedPanels } from './types';

export const migrateDashboardState = Annotation.Root({
  id: Annotation<string>(),
  original_dashboard: Annotation<OriginalDashboard>(),
  parsed_original_dashboard: Annotation<ParsedOriginalDashboard>(),
  translated_panels: Annotation<TranslatedPanels>({
    reducer: (current, value) => current.concat(value),
    default: () => [],
  }),
  failed_panel_translations: Annotation<FailedPanelTranslations>({
    reducer: (current, value) => current.concat(value),
    default: () => [],
  }),
  elastic_dashboard: Annotation<ElasticDashboard>({
    reducer: (current, value) => ({ ...current, ...value }),
  }),
  resources: Annotation<MigrationResources>(),
  translation_result: Annotation<MigrationTranslationResult>(),
  comments: Annotation<DashboardMigrationDashboard['comments']>({
    // Translation subgraph causes the original main graph comments to be concatenated again, we need to deduplicate them.
    reducer: (current, value) => uniq(value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
});

export const migrateDashboardConfigSchema = Annotation.Root({
  skipPrebuiltDashboardsMatching: Annotation<boolean | undefined>(),
});

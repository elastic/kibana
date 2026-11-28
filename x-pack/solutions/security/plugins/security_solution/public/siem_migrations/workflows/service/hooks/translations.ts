/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GET_MIGRATION_WORKFLOWS_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.service.getMigrationWorkflowsFailDescription',
  { defaultMessage: 'Failed to fetch the translated workflows' }
);

export const GET_MIGRATION_TRANSLATION_STATS_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.service.getTranslationStatsFailDescription',
  { defaultMessage: 'Failed to fetch the workflows translation stats' }
);

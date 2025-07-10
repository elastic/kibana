/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_MIGRATIONS_ASSISTANT_USER } from '../../../../../../common/siem_migrations/constants';
import type { RuleMigrationComment } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

export const cleanMarkdown = (markdown: string): string => {
  // Use languages known by the code block plugin
  return markdown.replaceAll('```esql', '```sql').replaceAll('```spl', '```splunk-spl');
};

export const generateAssistantComment = (message: string): RuleMigrationComment => {
  return {
    message,
    created_at: new Date().toISOString(),
    created_by: SIEM_MIGRATIONS_ASSISTANT_USER,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_MIGRATION_SKILLS = {
  SUMMARIZE: 'automatic-migration-rules-summarize',
  START: 'automatic-migration-rules-start-migration',
  STOP: 'automatic-migration-rules-stop-migration',
  UPDATE: 'automatic-migration-rules-update-migration',
  DELETE: 'automatic-migration-rules-delete-migration',
  // Not yet registered — skill is implemented in PR 3 of 4.
  INSTALL: 'automatic-migration-rules-install-rules',
} as const;

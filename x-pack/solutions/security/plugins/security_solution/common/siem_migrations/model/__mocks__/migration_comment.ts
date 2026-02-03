/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_MIGRATIONS_ASSISTANT_USER } from '../../constants';
import type { MigrationComment } from '../common.gen';

export const getUserComment = (overrides?: Partial<MigrationComment>): MigrationComment => {
  return {
    created_at: '2025-09-24T12:00:00.000Z',
    created_by: 'elastic',
    message: 'User says hi',
    ...overrides,
  };
};

export const getAssistantComment = (
  overrides?: Partial<Omit<MigrationComment, 'created_by'>>
): MigrationComment => {
  return {
    created_at: '2025-09-24T17:36:59.479Z',
    created_by: SIEM_MIGRATIONS_ASSISTANT_USER,
    message: 'Assistant says hi',
    ...overrides,
  };
};

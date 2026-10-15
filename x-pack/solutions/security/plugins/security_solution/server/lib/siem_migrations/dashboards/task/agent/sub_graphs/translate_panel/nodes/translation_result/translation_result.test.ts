/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { getTranslationResultNode } from './translation_result';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { TRANSLATION_INDEX_PATTERN } from '../../../../constants';
import { MigrationTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { TranslateDashboardPanelState } from '../../types';

const baseState = {
  parsed_panel: {
    id: 'panel-1',
    title: 'Test Panel',
    query: 'index=main | stats count',
    viz_type: 'table',
    position: { x: 0, y: 0, w: 24, h: 16 },
  },
  validation_errors: { retries_left: 0 },
  esql_query_columns: [],
} as unknown as TranslateDashboardPanelState;

describe('getTranslationResultNode', () => {
  const logger = loggerMock.create();

  it('should replace TRANSLATION_INDEX_PATTERN with MISSING_INDEX_PATTERN_PLACEHOLDER when index_pattern is missing', async () => {
    const node = getTranslationResultNode({ logger });
    const esqlQuery = `FROM ${TRANSLATION_INDEX_PATTERN}\n| STATS count = COUNT(*) BY process.name`;
    const state = { ...baseState, esql_query: esqlQuery, index_pattern: undefined };

    const result = await node(state, {});

    expect(result.translation_result).toBe(MigrationTranslationResult.PARTIAL);
    expect(result.comments).toBeDefined();
    for (const comment of result.comments!) {
      expect(comment.message).toContain(MISSING_INDEX_PATTERN_PLACEHOLDER);
      expect(comment.message).not.toContain(TRANSLATION_INDEX_PATTERN);
    }
  });

  it('should replace TRANSLATION_INDEX_PATTERN with MISSING_INDEX_PATTERN_PLACEHOLDER when index_pattern is the placeholder', async () => {
    const node = getTranslationResultNode({ logger });
    const esqlQuery = `FROM ${TRANSLATION_INDEX_PATTERN}\n| STATS count = COUNT(*) BY process.name`;
    const state = {
      ...baseState,
      esql_query: esqlQuery,
      index_pattern: MISSING_INDEX_PATTERN_PLACEHOLDER,
    };

    const result = await node(state, {});

    expect(result.translation_result).toBe(MigrationTranslationResult.PARTIAL);
    expect(result.comments).toBeDefined();
    for (const comment of result.comments!) {
      expect(comment.message).toContain(MISSING_INDEX_PATTERN_PLACEHOLDER);
      expect(comment.message).not.toContain(TRANSLATION_INDEX_PATTERN);
    }
  });

  it('should not replace index pattern in query when a real index is provided', async () => {
    const node = getTranslationResultNode({ logger });
    const esqlQuery = `FROM logs-test-*\n| STATS count = COUNT(*) BY process.name`;
    const state = { ...baseState, esql_query: esqlQuery, index_pattern: 'logs-test-*' };

    const result = await node(state, {});

    expect(result.translation_result).toBe(MigrationTranslationResult.FULL);
    expect(result.comments).toBeDefined();
    for (const comment of result.comments!) {
      expect(comment.message).toContain('logs-test-*');
      expect(comment.message).not.toContain(MISSING_INDEX_PATTERN_PLACEHOLDER);
    }
  });
});

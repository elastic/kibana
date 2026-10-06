/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationTranslationResult } from '../../../../../../../common/siem_migrations/constants';
import { generateAssistantComment } from '../../../../common/task/util/comments';
import type { GraphNode } from '../types';

const resolveTranslationResult = (state: {
  report?: { mapped: unknown[]; skipped: unknown[] };
  validation?: { valid: boolean };
}): MigrationTranslationResult => {
  const mapped = state.report?.mapped.length ?? 0;
  const skipped = state.report?.skipped.length ?? 0;
  const valid = state.validation?.valid ?? false;

  if (mapped === 0) {
    return MigrationTranslationResult.UNTRANSLATABLE;
  }
  if (skipped > 0 || !valid) {
    return MigrationTranslationResult.PARTIAL;
  }
  return MigrationTranslationResult.FULL;
};

/**
 * Finalizes elastic_workflow, translation_result, and comments for ES persistence.
 */
export const getFinalizeNode = (): GraphNode => {
  return async (state) => {
    const comments = [];
    if (state.llm_summary) {
      comments.push(generateAssistantComment(state.llm_summary));
    }
    if (state.validation && !state.validation.valid) {
      comments.push(
        generateAssistantComment(
          `Workflow schema validation issues: ${(state.validation.errors ?? []).join('; ')}`
        )
      );
    }

    return {
      elastic_workflow: {
        title: state.original_workflow.title,
        description: state.original_workflow.description,
        yaml: state.yaml,
      },
      translation_result: resolveTranslationResult(state),
      comments,
    };
  };
};

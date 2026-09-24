/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  materializeArticleStepCommonDefinition,
  type MaterializeArticleInput,
} from '../../../../../common/threat_intel/workflows/step_types/materialize_article/materialize_article_common';
import { materializeArticle } from '../../../services/materialize_article';

export interface BuildMaterializeArticleStepDeps {
  logger: Logger;
}

export const buildMaterializeArticleStepDefinition = (deps: BuildMaterializeArticleStepDeps) =>
  createServerStepDefinition({
    ...materializeArticleStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as MaterializeArticleInput;
      const stepLogger = deps.logger.get('threatIntel', 'materialize_article', 'jina');
      const output = await materializeArticle(input, context.abortSignal);

      if (output.materialization.status === 'fallback') {
        stepLogger.warn(
          `Jina materialization fell back to RSS for ${input.article_url || '<missing URL>'}: ${
            output.materialization.reason
          }`
        );
      } else {
        stepLogger.debug(
          `Jina materialization status=${output.materialization.status} ` +
            `rendered_chars=${output.materialization.rendered_chars}`
        );
      }

      return { output };
    },
  });

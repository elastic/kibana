/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { readCaptureConfigCommonDefinition } from '../../common/step_types/read_capture_config';
import {
  CAPTURE_CONFIG_DOC_ID,
  CAPTURE_CONFIG_INDEX,
  CAPTURE_LOG_CATEGORY_FIELD_DEFAULT,
  CAPTURE_LOG_INDEX_DEFAULT,
  CAPTURE_LOG_LEVELS_DEFAULT,
} from '../../common/constants';

interface CaptureConfigDoc {
  index: string;
  categoryField: string;
  logLevels?: string[];
}

export const readCaptureConfigStepDefinition = createServerStepDefinition({
  ...readCaptureConfigCommonDefinition,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();

    try {
      const resp = await esClient.get<CaptureConfigDoc>(
        { index: CAPTURE_CONFIG_INDEX, id: CAPTURE_CONFIG_DOC_ID },
        { signal: context.abortSignal }
      );
      if (resp.found && resp._source) {
        return {
          output: {
            index: resp._source.index,
            categoryField: resp._source.categoryField,
            logLevels: resp._source.logLevels ?? [...CAPTURE_LOG_LEVELS_DEFAULT],
            configured: true,
          },
        };
      }
    } catch {
      // Config index or document doesn't exist yet — use defaults
    }

    return {
      output: {
        index: CAPTURE_LOG_INDEX_DEFAULT,
        categoryField: CAPTURE_LOG_CATEGORY_FIELD_DEFAULT,
        logLevels: [...CAPTURE_LOG_LEVELS_DEFAULT],
        configured: false,
      },
    };
  },
});

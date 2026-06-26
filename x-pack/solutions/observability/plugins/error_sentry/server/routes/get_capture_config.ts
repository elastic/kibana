/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { CaptureConfig } from '../../common/constants';
import {
  CAPTURE_CONFIG_DOC_ID,
  CAPTURE_CONFIG_INDEX,
  CAPTURE_LOG_CATEGORY_FIELD_DEFAULT,
  CAPTURE_LOG_INDEX_DEFAULT,
  CAPTURE_LOG_LEVELS_DEFAULT,
} from '../../common/constants';

export const registerGetCaptureConfigRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/error_sentry/capture_config',
      validate: false,
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    async (context, _request, response) => {
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      try {
        const resp = await esClient.get<CaptureConfig>({
          index: CAPTURE_CONFIG_INDEX,
          id: CAPTURE_CONFIG_DOC_ID,
        });
        if (resp.found && resp._source) {
          return response.ok({
            body: {
              index: resp._source.index,
              categoryField: resp._source.categoryField,
              logLevels: resp._source.logLevels ?? [...CAPTURE_LOG_LEVELS_DEFAULT],
            },
          });
        }
      } catch {
        // Config doc doesn't exist yet — return defaults
      }

      return response.ok({
        body: {
          index: CAPTURE_LOG_INDEX_DEFAULT,
          categoryField: CAPTURE_LOG_CATEGORY_FIELD_DEFAULT,
          logLevels: [...CAPTURE_LOG_LEVELS_DEFAULT],
        },
      });
    }
  );
};

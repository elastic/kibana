/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import { CASES_OWNER } from '../../common/constants';

const ERROR_SENTRY_TAG = 'error-sentry';
const RECENT_CASES_LIMIT = 10;

export const registerGetCasesStatsRoute = (
  router: IRouter,
  getCasesStart: () => CasesServerStart
) => {
  router.get(
    {
      path: '/internal/error_sentry/cases_stats',
      validate: false,
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    async (_context, request, response) => {
      const casesStart = getCasesStart();
      const casesClient = await casesStart.getCasesClientWithRequest(request);

      const result = await casesClient.cases.find({
        owner: [CASES_OWNER],
        tags: [ERROR_SENTRY_TAG],
        sortField: 'createdAt',
        sortOrder: 'desc',
        perPage: RECENT_CASES_LIMIT,
      });

      return response.ok({
        body: {
          total: result.total,
          open: result.count_open_cases,
          inProgress: result.count_in_progress_cases,
          closed: result.count_closed_cases,
          recentCases: result.cases.map((c) => ({
            id: c.id,
            title: c.title,
            status: c.status,
            createdAt: c.created_at,
            commentCount: c.totalComment,
          })),
        },
      });
    }
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INTERNAL_ALERTING_GAPS_FIND_API_PATH,
  INTERNAL_ALERTING_GAPS_FILL_BY_ID_API_PATH,
  INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
} from '@kbn/alerting-plugin/common';
import type { GapAutoFillSchedulerResponseBodyV1 } from '@kbn/alerting-plugin/common/routes/gaps/apis/gap_auto_fill_scheduler';
import { DEFAULT_GAP_AUTO_FILL_SCHEDULER_ID_PREFIX } from '@kbn/security-solution-plugin/public/detection_engine/rule_gaps/constants';
import { rootRequest } from './common';
import { getSpaceUrl } from '../space';

export const interceptGetRuleGapsNoData = () => {
  cy.intercept('POST', `${INTERNAL_ALERTING_GAPS_FIND_API_PATH}*`, {
    statusCode: 200,
    body: {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    },
  }).as('getRuleGaps');
};

export const interceptGetRuleGaps = () => {
  cy.intercept('POST', `${INTERNAL_ALERTING_GAPS_FIND_API_PATH}*`, {
    statusCode: 200,
    body: {
      page: 1,
      per_page: 10,
      total: 3,
      data: [
        {
          _id: 'test-id-1',
          '@timestamp': '2024-01-01T00:00:00.000Z',
          range: {
            gte: '2024-01-01T00:00:00.000Z',
            lte: '2024-01-02T00:00:00.000Z',
          },
          filled_intervals: [],
          in_progress_intervals: [],
          unfilled_intervals: [
            {
              gte: '2024-01-01T00:00:00.000Z',
              lte: '2024-01-02T00:00:00.000Z',
            },
          ],
          status: 'unfilled',
          total_gap_duration_ms: 86400000,
          filled_duration_ms: 0,
          unfilled_duration_ms: 86400000,
          in_progress_duration_ms: 0,
        },
        {
          _id: 'test-id-2',
          '@timestamp': '2024-01-02T00:00:00.000Z',
          range: {
            gte: '2024-01-02T00:00:00.000Z',
            lte: '2024-01-03T00:00:00.000Z',
          },
          filled_intervals: [
            {
              gte: '2024-01-02T00:00:00.000Z',
              lte: '2024-01-02T12:00:00.000Z',
            },
          ],
          in_progress_intervals: [
            {
              gte: '2024-01-02T12:00:00.000Z',
              lte: '2024-01-03T00:00:00.000Z',
            },
          ],
          unfilled_intervals: [],
          status: 'partially_filled',
          total_gap_duration_ms: 86400000,
          filled_duration_ms: 43200000,
          unfilled_duration_ms: 0,
          in_progress_duration_ms: 43200000,
        },
        {
          _id: 'test-id-3',
          '@timestamp': '2024-01-02T00:00:00.000Z',
          range: {
            gte: '2024-01-02T00:00:00.000Z',
            lte: '2024-01-03T00:00:00.000Z',
          },
          filled_intervals: [
            {
              gte: '2024-01-02T00:00:00.000Z',
              lte: '2024-01-03T00:00:00.000Z',
            },
          ],
          in_progress_intervals: [],
          unfilled_intervals: [],
          status: 'filled',
          total_gap_duration_ms: 86400000,
          filled_duration_ms: 86400000,
          unfilled_duration_ms: 0,
          in_progress_duration_ms: 0,
        },
        {
          _id: 'test-id-4',
          '@timestamp': '2024-01-02T00:00:00.000Z',
          range: {
            gte: '2024-01-02T00:00:00.000Z',
            lte: '2024-01-03T00:00:00.000Z',
          },
          filled_intervals: [
            {
              gte: '2024-01-02T00:00:00.000Z',
              lte: '2024-01-02T12:00:00.000Z',
            },
          ],
          in_progress_intervals: [],
          unfilled_intervals: [
            {
              gte: '2024-01-02T12:00:00.000Z',
              lte: '2024-01-03T00:00:00.000Z',
            },
          ],
          status: 'partially_filled',
          total_gap_duration_ms: 86400000,
          filled_duration_ms: 43200000,
          unfilled_duration_ms: 43200000,
          in_progress_duration_ms: 0,
        },
      ],
    },
  }).as('getRuleGaps');
};

export const interceptFillGap = () => {
  cy.intercept('POST', `${INTERNAL_ALERTING_GAPS_FILL_BY_ID_API_PATH}*`, {
    statusCode: 200,
    body: {},
  }).as('fillGap');
};

interface InterceptBulkFillRulesGapsParams {
  succeeded: number;
  failed: number;
  skipped: number;
  errorsArray?: Array<{
    message: string;
    status_code: number;
    rules: Array<{ id: string; name: string }>;
  }>;
  delay?: number;
}
export const interceptBulkFillRulesGaps = ({
  succeeded,
  failed,
  skipped,
  errorsArray = [],
  delay = 0,
}: InterceptBulkFillRulesGapsParams) => {
  const rulesCount = succeeded + failed + skipped;
  const statusCode = failed === 0 ? 200 : 500;
  cy.intercept(
    {
      method: 'POST',
      url: '/api/detection_engine/rules/_bulk_action?dry_run=false',
    },
    (req) => {
      if (req.body.action === 'fill_gaps') {
        return new Promise((resolve) => {
          setTimeout(() => {
            req.reply(statusCode, {
              successful: failed === 0,
              rules_count: rulesCount,
              attributes: {
                errors: errorsArray,
                results: [],
                summary: {
                  failed,
                  succeeded,
                  skipped,
                  total: rulesCount,
                },
              },
            });
            resolve();
          }, delay);
        });
      } else {
        req.continue();
      }
    }
  ).as('bulkFillRulesGaps');
};

const getSchedulerId = (spaceId = 'default') =>
  `${DEFAULT_GAP_AUTO_FILL_SCHEDULER_ID_PREFIX}-${spaceId}`;

const getSchedulerUrl = (spaceId = 'default') =>
  getSpaceUrl(
    spaceId,
    `${INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/${getSchedulerId(spaceId)}`
  );

export const deleteGapAutoFillScheduler = () =>
  cy.currentSpace().then((spaceId) =>
    rootRequest({
      method: 'DELETE',
      url: getSchedulerUrl(spaceId),
      failOnStatusCode: false,
    })
  );

export const getGapAutoFillSchedulerApi = () =>
  cy.currentSpace().then((spaceId) =>
    rootRequest<GapAutoFillSchedulerResponseBodyV1>({
      method: 'GET',
      url: getSchedulerUrl(spaceId),
      failOnStatusCode: false,
    })
  );

export const interceptGapAutoFillSchedulerLogsWithErrors = () => {
  cy.intercept('POST', `${INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/*/logs`, (req) => {
    req.reply({
      statusCode: 200,
      body: {
        page: 1,
        per_page: 1,
        total: 2,
        data: [
          {
            id: 'error-log-1',
            timestamp: new Date().toISOString(),
            status: 'error',
            message: 'Failed to schedule gap fill',
            results: [],
          },
        ],
      },
    });
  }).as('getGapAutoFillSchedulerLogsWithErrors');
};

export const interceptGapAutoFillScheduler = ({ enabled }: { enabled: boolean }) => {
  cy.intercept('GET', `${INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/*`, {
    statusCode: 200,
    body: {
      id: 'gap-auto-fill-scheduler-default',
      name: 'Gap Auto Fill Scheduler',
      enabled,
      gap_fill_range: '24h',
      max_backfills: 10,
      num_retries: 3,
      schedule: {
        interval: '1h',
      },
      scope: 'all',
      rule_types: [],
      created_by: 'elastic',
      updated_by: 'elastic',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }).as('getGapAutoFillScheduler');
};

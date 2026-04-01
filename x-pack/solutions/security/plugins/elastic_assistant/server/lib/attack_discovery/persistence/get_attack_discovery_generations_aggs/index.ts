/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * Returns an Elasticsearch query to search the event log for the authenticated
 * users' generation by ID
 * */
export const getAttackDiscoveryGenerationsAggs = (size: number): estypes.SearchRequest => ({
  // aggregations group the generation events by their execution UUID
  aggs: {
    generations: {
      terms: {
        field: 'kibana.alert.rule.execution.uuid',
        size, // the number of generations to return
        order: {
          generation_start_time: 'desc', // the latest generations by event.start
        },
      },
      aggs: {
        alerts_context_count: {
          max: {
            field: 'kibana.alert.rule.execution.metrics.alert_counts.active',
          },
        },
        connector_id: {
          terms: {
            field: 'event.dataset',
          },
        },
        discoveries: {
          max: {
            field: 'kibana.alert.rule.execution.metrics.alert_counts.new',
          },
        },
        event_actions: {
          terms: {
            field: 'event.action',
          },
        },
        event_reason: {
          terms: {
            field: 'event.reason',
          },
        },
        generation_end_time: {
          max: {
            field: 'event.end',
            format: 'strict_date_optional_time',
          },
        },
        generation_start_time: {
          min: {
            field: 'event.start',
            format: 'strict_date_optional_time',
          },
        },
        loading_message: {
          terms: {
            field: 'kibana.alert.rule.execution.status',
          },
        },
        /**
         * Workflow tracking aggregations
         *
         * New workflow fields (preferred):
         * - event.module: workflow definition ID ("workflowId")
         * - event.id: workflow run ID ("workflowRunId")
         *
         * Legacy workflow field (deprecated):
         * - event.reference: colon-separated string "workflowId:workflowRunId"
         *
         * NOTE: The legacy `workflow_reference` aggregation is NOT decoded by the
         * transform. Old events will have undefined workflow IDs.
         *
         * @see write_attack_discovery_event.ts for field mapping details
         */
        workflow_id: {
          terms: {
            field: 'event.module',
          },
        },
        workflow_run_id: {
          terms: {
            field: 'event.id',
          },
        },
        workflow_reference: {
          terms: {
            field: 'event.reference',
          },
        },
      },
    },
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const successfulExecuteEvent = {
  '@timestamp': '2026-03-11T11:54:41.352Z',
  message: "rule executed: siem.queryRule:PLACEHOLDER_RULE_ID: 'Test Rule'",
  rule: {
    id: 'PLACEHOLDER_RULE_ID',
    license: 'basic',
    category: 'siem.queryRule',
    ruleset: 'siem',
    name: 'Test Rule',
  },
  event: {
    provider: 'alerting',
    action: 'execute',
    kind: 'alert',
    category: ['siem'],
    start: '2026-03-11T11:54:40.789Z',
    end: '2026-03-11T11:54:41.352Z',
    duration: 563000000,
    outcome: 'success',
  },
  kibana: {
    alerting: {
      outcome: 'success',
      status: 'ok',
    },
    alert: {
      rule: {
        rule_type_id: 'siem.queryRule',
        consumer: 'siem',
        revision: 1,
        execution: {
          uuid: 'PLACEHOLDER_EXECUTION_UUID',
          metrics: {
            number_of_triggered_actions: 0,
            number_of_generated_actions: 0,
            number_of_searches: 2,
            es_search_duration_ms: 1,
            total_search_duration_ms: 15,
            number_of_delayed_alerts: 0,
            alert_counts: { active: 0, new: 0, recovered: 0 },
            indices_found: 10,
            events_found_count: 100,
            candidate_alerts_count: 10,
            indexed_alerts_count: 10,
            execution_duration_ms: 563,
          },
        },
      },
    },
    saved_objects: [
      {
        rel: 'primary',
        type: 'alert',
        id: 'PLACEHOLDER_RULE_ID',
        type_id: 'siem.queryRule',
      },
    ],
    space_ids: ['default'],
    task: {
      scheduled: '2026-03-11T11:54:37.740Z',
      schedule_delay: 3049000000,
    },
    server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
    version: '9.4.0',
  },
  ecs: {
    version: '1.8.0',
  },
};

export const warningExecuteEvent = {
  '@timestamp': '2026-03-11T10:30:00.000Z',
  message: 'Unable to find matching indices for rule "Test Rule".',
  rule: {
    id: 'PLACEHOLDER_RULE_ID',
    license: 'basic',
    category: 'siem.queryRule',
    ruleset: 'siem',
    name: 'Test Rule',
  },
  event: {
    provider: 'alerting',
    action: 'execute',
    kind: 'alert',
    category: ['siem'],
    start: '2026-03-11T10:29:59.755Z',
    end: '2026-03-11T10:30:00.000Z',
    duration: 245000000,
    outcome: 'success',
    reason: 'unknown',
  },
  kibana: {
    alerting: {
      outcome: 'warning',
      status: 'ok',
    },
    alert: {
      rule: {
        rule_type_id: 'siem.queryRule',
        consumer: 'siem',
        revision: 1,
        execution: {
          uuid: 'PLACEHOLDER_EXECUTION_UUID',
          metrics: {
            number_of_triggered_actions: 0,
            number_of_generated_actions: 0,
            number_of_searches: 1,
            es_search_duration_ms: 0,
            total_search_duration_ms: 3,
            number_of_delayed_alerts: 0,
            alert_counts: { active: 0, new: 0, recovered: 0 },
            indices_found: 0,
            events_found_count: 0,
            candidate_alerts_count: 0,
            indexed_alerts_count: 0,
            execution_duration_ms: 150,
          },
        },
      },
    },
    saved_objects: [
      {
        rel: 'primary',
        type: 'alert',
        id: 'PLACEHOLDER_RULE_ID',
        type_id: 'siem.queryRule',
      },
    ],
    space_ids: ['default'],
    task: {
      scheduled: '2026-03-11T10:29:56.623Z',
      schedule_delay: 3132000000,
    },
    server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
    version: '9.4.0',
  },
  ecs: {
    version: '1.8.0',
  },
};

export const failedExecuteEvent = {
  '@timestamp': '2026-03-11T09:00:00.000Z',
  message:
    'siem.queryRule:PLACEHOLDER_RULE_ID: execution failed - An unrecoverable error occurred during rule execution.',
  error: {
    message: 'An unrecoverable error occurred during rule execution.',
  },
  rule: {
    id: 'PLACEHOLDER_RULE_ID',
    license: 'basic',
    category: 'siem.queryRule',
    ruleset: 'siem',
    name: 'Test Rule',
  },
  event: {
    provider: 'alerting',
    action: 'execute',
    kind: 'alert',
    category: ['siem'],
    start: '2026-03-11T08:59:59.955Z',
    end: '2026-03-11T09:00:00.000Z',
    duration: 45000000,
    outcome: 'failure',
    reason: 'execute',
  },
  kibana: {
    alerting: {
      outcome: 'failure',
      status: 'error',
    },
    alert: {
      rule: {
        rule_type_id: 'siem.queryRule',
        consumer: 'siem',
        revision: 1,
        execution: {
          uuid: 'PLACEHOLDER_EXECUTION_UUID',
          metrics: {
            number_of_triggered_actions: 0,
            number_of_generated_actions: 0,
            number_of_searches: 1,
            es_search_duration_ms: 0,
            total_search_duration_ms: 5,
            number_of_delayed_alerts: 0,
            alert_counts: { active: 0, new: 0, recovered: 0 },
            indices_found: 5,
            events_found_count: 0,
            candidate_alerts_count: 0,
            indexed_alerts_count: 0,
            execution_duration_ms: 45,
          },
        },
      },
    },
    saved_objects: [
      {
        rel: 'primary',
        type: 'alert',
        id: 'PLACEHOLDER_RULE_ID',
        type_id: 'siem.queryRule',
      },
    ],
    space_ids: ['default'],
    task: {
      scheduled: '2026-03-11T08:59:57.883Z',
      schedule_delay: 2072000000,
    },
    server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
    version: '9.4.0',
  },
  ecs: {
    version: '1.8.0',
  },
};

/**
 * Event for a manual (backfill) run.
 * Note: action is "execute-backfill", not "execute".
 */
export const manualRunExecuteEvent = {
  '@timestamp': '2026-03-11T12:00:00.000Z',
  message: "rule executed: siem.queryRule:PLACEHOLDER_RULE_ID: 'Test Rule'",
  rule: {
    id: 'PLACEHOLDER_RULE_ID',
    license: 'basic',
    category: 'siem.queryRule',
    ruleset: 'siem',
    name: 'Test Rule',
  },
  event: {
    provider: 'alerting',
    action: 'execute-backfill',
    kind: 'alert',
    category: ['siem'],
    start: '2026-03-11T11:59:59.200Z',
    end: '2026-03-11T12:00:00.000Z',
    duration: 800000000,
    outcome: 'success',
  },
  kibana: {
    alerting: {
      outcome: 'success',
      status: 'ok',
    },
    alert: {
      rule: {
        rule_type_id: 'siem.queryRule',
        consumer: 'siem',
        revision: 1,
        execution: {
          uuid: 'PLACEHOLDER_EXECUTION_UUID',
          metrics: {
            number_of_triggered_actions: 0,
            number_of_generated_actions: 0,
            number_of_searches: 2,
            es_search_duration_ms: 3,
            total_search_duration_ms: 10,
            number_of_delayed_alerts: 0,
            alert_counts: { active: 0, new: 0, recovered: 0 },
            indices_found: 5,
            events_found_count: 50,
            candidate_alerts_count: 3,
            indexed_alerts_count: 3,
            execution_duration_ms: 800,
          },
          backfill: {
            start: '2026-03-11T00:00:00.000Z',
            interval: '1d',
          },
        },
      },
    },
    saved_objects: [
      {
        rel: 'primary',
        type: 'alert',
        id: 'PLACEHOLDER_RULE_ID',
        type_id: 'siem.queryRule',
      },
    ],
    space_ids: ['default'],
    task: {
      scheduled: '2026-03-11T11:59:57.128Z',
      schedule_delay: 2072000000,
    },
    server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
    version: '9.4.0',
  },
  ecs: {
    version: '1.8.0',
  },
};

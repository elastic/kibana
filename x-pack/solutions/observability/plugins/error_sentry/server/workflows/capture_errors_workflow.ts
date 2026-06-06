/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Error Sentry "capture-errors" workflow. Created as a normal (unmanaged) workflow on plugin
 * start so it shows up in the Workflows app list and can be browsed / run / edited like any other.
 *
 * Scheduled trigger → `error-sentry.collectLogPatterns` → `foreach` → for each pattern, look for an
 * existing case by its stable hash marker tag and add an occurrence comment, otherwise open a new
 * Kibana case (`cases.createCase`). This makes re-runs idempotent (no duplicate cases).
 *
 * The plugin also registers `error-sentry.createGithubIssue` for setups that prefer GitHub issues;
 * swap the `cases.*` steps for it if desired.
 */
export { ERROR_SENTRY_CAPTURE_WORKFLOW_ID } from '../../common/constants';

const CASE_OWNER = 'observability';

export const errorSentryCaptureWorkflowYaml = `name: Error Sentry - Capture log error patterns
enabled: true
triggers:
  - type: scheduled
    with:
      every: 24h
steps:
  - name: collect
    type: error-sentry.collectLogPatterns
    with:
      index: logs-*
      lookbackDays: 7
      categoryField: message
      minDocCount: 50
      size: 20
      logLevels:
        - ERROR
        - FATAL
      samplingProbability: 0.1
  - name: process_patterns
    type: foreach
    foreach: "{{ steps.collect.output.patterns }}"
    steps:
      - name: find_existing
        type: cases.findCases
        with:
          owner: ${CASE_OWNER}
          status:
            - open
            - in-progress
          tags:
            - "error-sentry:{{ foreach.item.hash }}"
      - name: upsert_case
        type: if
        condition: 'steps.find_existing.output.total > 0'
        steps:
          - name: add_occurrence_comment
            type: cases.addComment
            with:
              case_id: "{{ steps.find_existing.output.cases[0].id }}"
              comment: |
                Still occurring — {{ foreach.item.docCount }} occurrence(s) in the latest run.
        else:
          - name: create_case
            type: cases.createCase
            with:
              title: "[Kibana Log] {{ foreach.item.key }}"
              description: |
                Recurring log pattern detected by Error Sentry.

                Occurrences (last run): {{ foreach.item.docCount }}

                Pattern: {{ foreach.item.key }}
              tags:
                - error-sentry
                - error-category
                - "error-sentry:{{ foreach.item.hash }}"
              owner: ${CASE_OWNER}
              severity: "{{ foreach.item.severity }}"
`;

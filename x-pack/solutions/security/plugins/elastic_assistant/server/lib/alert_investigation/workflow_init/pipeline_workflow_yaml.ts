/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bundled YAML definition for the Alert Investigation Pipeline workflow.
 *
 * This is the canonical workflow definition that WorkflowInitService
 * ensures exists per Kibana space. If the workflow is deleted, modified,
 * or doesn't exist yet, it gets (re)created from this definition.
 *
 * The connector_id is intentionally omitted — it should be configured
 * per-space via the Workflows UI or API after the workflow is created.
 */
export const PIPELINE_WORKFLOW_YAML = `
name: Alert Investigation Pipeline
description: >
  Automated alert triage pipeline. Fetches unprocessed security alerts,
  deduplicates by similarity, groups by host/user entities, creates or
  updates investigation cases, attaches alerts, triggers Attack Discovery,
  and tags alerts as processed.
enabled: true
triggers:
  - type: manual
  - type: scheduled
    with:
      every: 15m
steps:
  - name: fetch_alerts
    type: security.fetchUnprocessedAlerts
    with:
      index_pattern: .alerts-security.alerts-default
      max_alerts: 500
      lookback_minutes: 60

  - name: deduplicate
    type: security.deduplicateAlerts
    with:
      alert_ids: "{{steps.fetch_alerts.output.alert_ids | json}}"
      index_pattern: .alerts-security.alerts-default
      similarity_threshold: 0.85

  - name: match_cases
    type: security.matchAndAttachAlertsToCases
    with:
      leader_alert_ids: "{{steps.deduplicate.output.leader_alert_ids | json}}"
      index_pattern: .alerts-security.alerts-default

  - name: handle_new_groups
    type: foreach
    foreach: "{{steps.match_cases.output.new_groups}}"
    steps:
      - name: create_case
        type: cases.createCase
        with:
          title: "Investigation - {{foreach.item.primary_host}} / {{foreach.item.primary_user}}"
          description: "Automated case for host {{foreach.item.primary_host}}, user {{foreach.item.primary_user}}"
          tags:
            - alert-investigation-pipeline
          owner: securitySolution
          severity: high
      - name: attach_new_alerts
        type: cases.attachAlert
        with:
          case_id: "{{steps.create_case.output.case.id}}"
          alert_id: "{{foreach.item.alert_ids | json}}"
          index: .alerts-security.alerts-default
      - name: trigger_ad_new
        type: security.triggerIncrementalAd
        with:
          case_id: "{{steps.create_case.output.case.id}}"
          alert_ids: "{{foreach.item.alert_ids | json}}"
          index_pattern: .alerts-security.alerts-default
          min_new_alerts: 1
      - name: add_ad_comment_new
        type: cases.addComment
        with:
          case_id: "{{steps.create_case.output.case.id}}"
          comment: "{{steps.trigger_ad_new.output.summary}}"

  - name: handle_existing_groups
    type: foreach
    foreach: "{{steps.match_cases.output.existing_groups}}"
    steps:
      - name: attach_existing_alerts
        type: cases.attachAlert
        with:
          case_id: "{{foreach.item.existing_case_id}}"
          alert_id: "{{foreach.item.alert_ids | json}}"
          index: .alerts-security.alerts-default
      - name: trigger_ad_existing
        type: security.triggerIncrementalAd
        with:
          case_id: "{{foreach.item.existing_case_id}}"
          alert_ids: "{{foreach.item.alert_ids | json}}"
          index_pattern: .alerts-security.alerts-default
          min_new_alerts: 1
      - name: add_ad_comment_existing
        type: cases.addComment
        with:
          case_id: "{{foreach.item.existing_case_id}}"
          comment: "{{steps.trigger_ad_existing.output.summary}}"

  - name: tag_processed
    type: security.tagProcessedAlerts
    with:
      alert_ids: "{{steps.fetch_alerts.output.alert_ids | json}}"
      index_pattern: .alerts-security.alerts-default
`.trim();

/**
 * Version hash of the bundled YAML.
 * Increment when YAML changes to trigger self-healing re-creation.
 */
export const PIPELINE_WORKFLOW_VERSION = '1.0.0';

/**
 * Workflow ID prefix. Full ID is `{PREFIX}-{spaceId}`.
 */
export const PIPELINE_WORKFLOW_ID_PREFIX = 'alert-investigation-pipeline';

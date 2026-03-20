/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Drift Events Ingest Pipeline
 *
 * Purpose: Enrich osquery differential results with drift metadata
 *
 * This pipeline:
 * 1. Sets drift.category based on query_id prefix
 * 2. Maps drift.severity based on category
 * 3. Copies osquery_meta.action to drift.action
 * 4. Sets event.* metadata fields
 * 5. Extracts drift.item details from osquery fields
 */

export const DRIFT_EVENTS_PIPELINE_PREFIX = 'endpoint-drift-events-ingest';

export const getDriftEventsPipelineId = (namespace: string): string =>
  `${DRIFT_EVENTS_PIPELINE_PREFIX}-${namespace}`;

export const getDriftEventsPipeline = (namespace: string) => ({
  id: getDriftEventsPipelineId(namespace),
  description: 'Enrich osquery differential results with drift metadata for drift detection',
  processors: [
    {
      script: {
        lang: 'painless',
        description: 'Set drift category and severity based on query ID',
        source: `
          def queryId = ctx.action_data?.query;
          if (queryId == null) { return; }

          if (ctx.drift == null) { ctx.drift = new HashMap(); }

          if (queryId.startsWith('drift_privileges')) {
            ctx.drift.category = 'privileges';
            ctx.drift.severity = 'high';
          } else if (queryId.startsWith('drift_persistence')) {
            ctx.drift.category = 'persistence';
            ctx.drift.severity = 'critical';
          } else if (queryId.startsWith('drift_network')) {
            ctx.drift.category = 'network';
            ctx.drift.severity = 'medium';
          } else if (queryId.startsWith('drift_software')) {
            ctx.drift.category = 'software';
            ctx.drift.severity = 'low';
          } else if (queryId.startsWith('drift_posture')) {
            ctx.drift.category = 'posture';
            ctx.drift.severity = 'high';
          } else {
            ctx.drift.category = 'unknown';
            ctx.drift.severity = 'low';
          }

          ctx.drift.query_id = queryId;
          ctx.drift.query_name = ctx.action_data?.query_name;
          if (ctx.drift.query_name == null) {
            ctx.drift.query_name = queryId;
          }
        `,
      },
    },
    {
      set: {
        field: 'drift.action',
        copy_from: 'osquery_meta.action',
        ignore_empty_value: true,
      },
    },
    {
      script: {
        lang: 'painless',
        description: 'Extract drift item details from osquery fields',
        source: `
          if (ctx.drift == null) { ctx.drift = new HashMap(); }
          if (ctx.drift.item == null) { ctx.drift.item = new HashMap(); }

          def osquery = ctx.osquery;
          if (osquery == null) { return; }

          def category = ctx.drift.category;

          if (category == 'privileges') {
            // User/group membership changes OR sudoers rule changes.
            if (osquery.username != null) {
              ctx.drift.item.type = 'user';
              ctx.drift.item.name = osquery.username ?: 'unknown';
              if (osquery.groupname != null) {
                ctx.drift.item.value = osquery.groupname;
              }
            } else if (osquery.sudoers_header != null || osquery.header != null) {
              ctx.drift.item.type = 'sudoers_rule';
              ctx.drift.item.name = osquery.sudoers_header ?: osquery.header ?: 'unknown';
              ctx.drift.item.value = osquery.sudoers_rule ?: osquery.rule_details;
            } else {
              ctx.drift.item.type = 'privilege_item';
              ctx.drift.item.name = osquery.name ?: 'unknown';
              ctx.drift.item.value = osquery.value;
            }
          } else if (category == 'persistence') {
            if (osquery.start_type != null) {
              ctx.drift.item.type = 'service';
            } else if (osquery.source != null) {
              ctx.drift.item.type = 'startup_item';
            } else if (osquery.enabled != null) {
              ctx.drift.item.type = 'scheduled_task';
            } else {
              ctx.drift.item.type = 'persistence_item';
            }
            // Prefer stable identifiers for non-startup persistence types (systemd units, cron).
            ctx.drift.item.name = osquery.name ?: osquery.command ?: osquery.id ?: 'unknown';
            ctx.drift.item.value = osquery.path ?: osquery.fragment_path ?: osquery.action;
          } else if (category == 'network') {
            // Ports OR network exposure objects (e.g., SMB shares).
            if (osquery.port != null || osquery.protocol != null) {
              ctx.drift.item.type = 'port';
              ctx.drift.item.name = osquery.process_name ?: 'unknown';
              if (osquery.port != null && osquery.protocol != null) {
                ctx.drift.item.value = osquery.port.toString() + '/' + osquery.protocol;
              }
            } else if (osquery.share_name != null || osquery.share_path != null) {
              ctx.drift.item.type = 'share';
              ctx.drift.item.name = osquery.share_name ?: 'unknown';
              ctx.drift.item.value = osquery.share_path;
            } else {
              ctx.drift.item.type = 'network_item';
              ctx.drift.item.name = osquery.name ?: 'unknown';
              ctx.drift.item.value = osquery.value;
            }
          } else if (category == 'software') {
            ctx.drift.item.type = 'software';
            ctx.drift.item.name = osquery.name ?: 'unknown';
            ctx.drift.item.value = osquery.version;
          } else if (category == 'posture') {
            ctx.drift.item.type = osquery.type ?: 'config';
            ctx.drift.item.name = osquery.name ?: 'unknown';
            ctx.drift.item.value = osquery.encrypted ?: osquery.global_state ?: osquery.secure_boot;
            if (ctx.drift.action == 'changed' && osquery.previous_value != null) {
              ctx.drift.item.previous_value = osquery.previous_value;
            }
          }
        `,
      },
    },
    {
      set: {
        field: 'event.kind',
        value: 'event',
      },
    },
    {
      set: {
        field: 'event.category',
        value: ['configuration'],
      },
    },
    {
      set: {
        field: 'event.type',
        value: ['change'],
      },
    },
    {
      set: {
        field: 'event.action',
        copy_from: 'drift.action',
        ignore_empty_value: true,
      },
    },
  ],
});

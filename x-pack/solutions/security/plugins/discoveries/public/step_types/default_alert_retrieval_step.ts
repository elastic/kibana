/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  DefaultAlertRetrievalStepCommonDefinition,
  DefaultAlertRetrievalStepTypeId,
} from '../../common/step_types/default_alert_retrieval_step';

export const defaultAlertRetrievalStepPublicDefinition: PublicStepDefinition = {
  ...DefaultAlertRetrievalStepCommonDefinition,

  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({
      default: icon,
    }))
  ),

  documentation: {
    details: i18n.translate(
      'xpack.discoveries.workflowSteps.defaultAlertRetrieval.documentation.details',
      {
        defaultMessage: `This step retrieves security alerts from Elasticsearch and prepares them for Attack Discovery generation.

**Key Features:**
- Queries alerts from specified index pattern
- Anonymizes sensitive fields based on configuration
- Converts alerts to LangChain Document format
- Returns both original and anonymized alerts
- Provides replacement map for de-anonymization

**Configuration:**
- {alertsIndexPattern}: Alert index pattern to query (e.g., '.alerts-security.alerts-default')
- {anonymizationFields}: Array of field configurations specifying which fields to allow/anonymize
- {apiConfig}: Connector configuration for LLM
- {size}: Maximum number of alerts to retrieve (default: 100)
- {start}/{end}: Time range for alert query (e.g., 'now-24h', 'now')
- {filter}: Optional KQL query to filter alerts

**Anonymization:**
Fields can be configured as:
- {allowed}: Include in output (allowed: true)
- {anonymized}: Replace with generic placeholder (anonymized: true)
- {excluded}: Omit from output (allowed: false)`,
        values: {
          alertsIndexPattern: '`alerts_index_pattern`',
          anonymizationFields: '`anonymization_fields`',
          apiConfig: '`api_config`',
          size: '`size`',
          start: '`start`',
          end: '`end`',
          filter: '`filter`',
          allowed: 'allowed',
          anonymized: 'anonymized',
          excluded: 'excluded',
        },
      }
    ),
    examples: [
      `## Basic alert retrieval (last 24 hours)
\`\`\`yaml
- name: retrieve_alerts
  type: ${DefaultAlertRetrievalStepTypeId}
  timeout: '5m'
  with:
    alerts_index_pattern: '.alerts-security.alerts-default'
    size: 100
    start: 'now-24h'
    end: 'now'
    api_config:
      action_type_id: '.gen-ai'
      connector_id: my-connector
\`\`\``,

      `## Custom time range
\`\`\`yaml
- name: retrieve_alerts
  type: ${DefaultAlertRetrievalStepTypeId}
  with:
    alerts_index_pattern: '.alerts-security.alerts-default'
    size: 150
    start: '2024-01-01T00:00:00Z'
    end: '2024-01-31T23:59:59Z'
    api_config:
      action_type_id: '.gemini'
      connector_id: my-gemini-connector
\`\`\``,

      `## With KQL filter
\`\`\`yaml
- name: retrieve_alerts
  type: ${DefaultAlertRetrievalStepTypeId}
  with:
    alerts_index_pattern: '.alerts-security.alerts-default'
    size: 100
    start: 'now-7d'
    end: 'now'
    filter:
      query: 'kibana.alert.severity: "high" OR kibana.alert.severity: "critical"'
      language: 'kuery'
    api_config:
      action_type_id: '.gen-ai'
      connector_id: my-connector
\`\`\``,

      `## Custom anonymization (minimal fields)
\`\`\`yaml
- name: retrieve_alerts
  type: ${DefaultAlertRetrievalStepTypeId}
  with:
    alerts_index_pattern: '.alerts-security.alerts-default'
    size: 100
    start: 'now-24h'
    end: 'now'
    anonymization_fields:
      - id: 'field-@timestamp'
        field: '@timestamp'
        allowed: true
        anonymized: false
      - id: 'field-event-action'
        field: 'event.action'
        allowed: true
        anonymized: false
      - id: 'field-host-name'
        field: 'host.name'
        allowed: true
        anonymized: true  # Replace with generic placeholder
      - id: 'field-user-name'
        field: 'user.name'
        allowed: true
        anonymized: true
    api_config:
      action_type_id: '.gen-ai'
      connector_id: my-connector
\`\`\``,

      `## Pass outputs to generation step
\`\`\`yaml
- name: retrieve_alerts
  type: ${DefaultAlertRetrievalStepTypeId}
  with:
    alerts_index_pattern: '.alerts-security.alerts-default'
    size: 100
    start: 'now-24h'
    end: 'now'
    api_config:
      action_type_id: '.gen-ai'
      connector_id: my-connector

- name: generate_discoveries
  type: attack-discovery.generate
  timeout: '10m'
  with:
    type: attack_discovery
    alerts: \${{ steps.retrieve_alerts.output.alerts }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    replacements: \${{ steps.retrieve_alerts.output.replacements }}
\`\`\``,
    ],
  },
};

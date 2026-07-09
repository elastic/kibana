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
  DefaultValidationStepCommonDefinition,
  DefaultValidationStepTypeId,
} from '../../common/step_types/default_validation_step';
import { PersistDiscoveriesStepTypeId } from '../../common/step_types/persist_discoveries_step';

export const defaultValidationStepPublicDefinition: PublicStepDefinition = {
  ...DefaultValidationStepCommonDefinition,

  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/inspect').then(({ icon }) => ({
      default: icon,
    }))
  ),

  documentation: {
    details: i18n.translate(
      'xpack.discoveries.workflowSteps.defaultValidation.documentation.details',
      {
        defaultMessage: `This step validates generated Attack Discoveries by detecting hallucinated alert references and removing duplicate discoveries. It does not persist results; use the {persistStep} step afterward to write validated discoveries to Elasticsearch.

**Key Features:**
- Detects and filters hallucinated alert IDs that do not exist in the alerts index
- Deduplicates discoveries to prevent redundant results
- Enriches discovery metadata with validation status
- De-anonymizes fields using replacement map (optional)
- Renders markdown fields for display (optional)

**Configuration:**
- {attackDiscoveries}: Array of discoveries from generation step
- {anonymizedAlerts}: Original anonymized alerts for context
- {replacements}: Map for de-anonymizing sensitive fields
- {apiConfig}: Connector configuration used for generation
- {connectorName}: Display name of the connector
- {generationUuid}: Execution UUID linking discoveries to generation event
- {alertsContextCount}: Number of alerts analyzed
- {enableFieldRendering}: Render markdown fields (default: true)
- {withReplacements}: Apply de-anonymization (default: false)

**Output:**
Returns validated discoveries with hallucinated references removed and duplicates filtered out. Pipe these into the {persistStep} step to write them to the Attack Discovery alerts index.`,
        values: {
          alertsContextCount: '`alerts_context_count`',
          anonymizedAlerts: '`anonymized_alerts`',
          apiConfig: '`api_config`',
          attackDiscoveries: '`attack_discoveries`',
          connectorName: '`connector_name`',
          enableFieldRendering: '`enable_field_rendering`',
          generationUuid: '`generation_uuid`',
          persistStep: '`attack-discovery.persistDiscoveries`',
          replacements: '`replacements`',
          withReplacements: '`with_replacements`',
        },
      }
    ),
    examples: [
      `## Basic validation
\`\`\`yaml
- name: validate_discoveries
  type: ${DefaultValidationStepTypeId}
  with:
    attack_discoveries: \${{ steps.generate_discoveries.output.attack_discoveries }}
    anonymized_alerts: \${{ steps.retrieve_alerts.output.anonymized_alerts }}
    replacements: \${{ steps.generate_discoveries.output.replacements }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    connector_name: \${{ steps.retrieve_alerts.output.connector_name }}
    generation_uuid: \${{ steps.generate_discoveries.output.execution_uuid }}
    alerts_context_count: \${{ steps.retrieve_alerts.output.alerts_context_count }}
\`\`\``,

      `## Validate then persist
\`\`\`yaml
- name: validate_discoveries
  type: ${DefaultValidationStepTypeId}
  with:
    attack_discoveries: \${{ steps.generate_discoveries.output.attack_discoveries }}
    anonymized_alerts: \${{ steps.retrieve_alerts.output.anonymized_alerts }}
    replacements: \${{ steps.generate_discoveries.output.replacements }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    connector_name: \${{ steps.retrieve_alerts.output.connector_name }}
    generation_uuid: \${{ steps.generate_discoveries.output.execution_uuid }}
    alerts_context_count: \${{ steps.retrieve_alerts.output.alerts_context_count }}

- name: persist_discoveries
  type: ${PersistDiscoveriesStepTypeId}
  with:
    attack_discoveries: \${{ steps.validate_discoveries.output.validated_discoveries }}
    anonymized_alerts: \${{ steps.retrieve_alerts.output.anonymized_alerts }}
    replacements: \${{ steps.generate_discoveries.output.replacements }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    connector_name: \${{ steps.retrieve_alerts.output.connector_name }}
    generation_uuid: \${{ steps.generate_discoveries.output.execution_uuid }}
    alerts_context_count: \${{ steps.retrieve_alerts.output.alerts_context_count }}
\`\`\``,

      `## Validation with de-anonymization enabled
\`\`\`yaml
- name: validate_discoveries
  type: ${DefaultValidationStepTypeId}
  with:
    attack_discoveries: \${{ steps.generate_discoveries.output.attack_discoveries }}
    anonymized_alerts: \${{ steps.retrieve_alerts.output.anonymized_alerts }}
    replacements: \${{ steps.generate_discoveries.output.replacements }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    connector_name: \${{ steps.retrieve_alerts.output.connector_name }}
    generation_uuid: \${{ steps.generate_discoveries.output.execution_uuid }}
    alerts_context_count: \${{ steps.retrieve_alerts.output.alerts_context_count }}
    with_replacements: true
\`\`\``,

      `## Full end-to-end pipeline: retrieve, generate, validate, persist
\`\`\`yaml
- name: retrieve_alerts
  type: attack-discovery.defaultAlertRetrieval
  timeout: '5m'
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

- name: validate_discoveries
  type: ${DefaultValidationStepTypeId}
  with:
    attack_discoveries: \${{ steps.generate_discoveries.output.attack_discoveries }}
    anonymized_alerts: \${{ steps.retrieve_alerts.output.anonymized_alerts }}
    replacements: \${{ steps.generate_discoveries.output.replacements }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    connector_name: \${{ steps.retrieve_alerts.output.connector_name }}
    generation_uuid: \${{ steps.generate_discoveries.output.execution_uuid }}
    alerts_context_count: \${{ steps.retrieve_alerts.output.alerts_context_count }}

- name: persist_discoveries
  type: ${PersistDiscoveriesStepTypeId}
  with:
    attack_discoveries: \${{ steps.validate_discoveries.output.validated_discoveries }}
    anonymized_alerts: \${{ steps.retrieve_alerts.output.anonymized_alerts }}
    replacements: \${{ steps.generate_discoveries.output.replacements }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    connector_name: \${{ steps.retrieve_alerts.output.connector_name }}
    generation_uuid: \${{ steps.generate_discoveries.output.execution_uuid }}
    alerts_context_count: \${{ steps.retrieve_alerts.output.alerts_context_count }}
    enable_field_rendering: true
    with_replacements: true
\`\`\``,
    ],
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { DefaultValidationStepTypeId } from '../../common/step_types/default_validation_step';
import {
  PersistDiscoveriesStepCommonDefinition,
  PersistDiscoveriesStepTypeId,
} from '../../common/step_types/persist_discoveries_step';

export const persistDiscoveriesStepPublicDefinition: PublicStepDefinition = {
  ...PersistDiscoveriesStepCommonDefinition,

  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/save').then(({ icon }) => ({
      default: icon,
    }))
  ),

  documentation: {
    details: i18n.translate(
      'xpack.discoveries.workflowSteps.persistDiscoveries.documentation.details',
      {
        defaultMessage: `This step writes Attack Discoveries as alerts to Elasticsearch, making them visible in the Attack Discovery UI. Use the {validationStep} step beforehand to filter hallucinated references and remove duplicates.

**Key Features:**
- Writes discoveries to the Attack Discovery alerts index
- Deduplicates discoveries before persisting
- De-anonymizes fields using replacement map (optional)
- Renders markdown fields for display (optional)
- Links discoveries to the generation execution

**Configuration:**
- {attackDiscoveries}: Array of validated discoveries to persist (typically from the {validationStep} step output)
- {anonymizedAlerts}: Original anonymized alerts for context
- {replacements}: Map for de-anonymizing sensitive fields
- {apiConfig}: Connector configuration used for generation
- {connectorName}: Display name of the connector
- {generationUuid}: Execution UUID linking discoveries to generation event
- {alertsContextCount}: Number of alerts analyzed
- {enableFieldRendering}: Render markdown fields (default: true)
- {withReplacements}: Apply de-anonymization (default: false)

**Output:**
Returns persisted discoveries from the Attack Discovery alerts index.`,
        values: {
          alertsContextCount: '`alerts_context_count`',
          anonymizedAlerts: '`anonymized_alerts`',
          apiConfig: '`api_config`',
          attackDiscoveries: '`attack_discoveries`',
          connectorName: '`connector_name`',
          enableFieldRendering: '`enable_field_rendering`',
          generationUuid: '`generation_uuid`',
          replacements: '`replacements`',
          validationStep: '`attack-discovery.defaultValidation`',
          withReplacements: '`with_replacements`',
        },
      }
    ),
    examples: [
      `## Basic persistence (after validation)
\`\`\`yaml
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

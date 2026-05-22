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
  GenerateStepCommonDefinition,
  GenerateStepTypeId,
} from '../../common/step_types/generate_step';

export const generateStepPublicDefinition: PublicStepDefinition = {
  ...GenerateStepCommonDefinition,

  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/sparkles').then(({ icon }) => ({
      default: icon,
    }))
  ),

  documentation: {
    details: i18n.translate('xpack.discoveries.workflowSteps.generate.documentation.details', {
      defaultMessage: `This step invokes an LLM-powered graph to analyze security alerts and generate attack discoveries or defend insights.

**Recommended Configuration:**
- Set a timeout of 10 minutes to allow sufficient time for complex analysis
- Use {templateSyntax} to pass alerts from the retrieval step
- The {sizeParam} parameter controls the maximum number of discoveries generated

**Performance Notes:**
- Generation time varies based on alert count and complexity
- Typical execution ranges from 15 seconds to 5 minutes
- Complex scenarios may require up to 10 minutes

**Input Requirements:**
- {alertsField}: Array of security alerts to analyze
- {apiConfigField}: Connector configuration with action_type_id and connector_id
- {typeField}: Either 'attack_discovery' or 'defend_insights'
- {replacementsField}: Optional anonymization replacements map
- {additionalContextField}: Optional free-form text appended to the LLM prompt`,
      values: {
        additionalContextField: '`additional_context`',
        templateSyntax: '`${{ steps.retrieve_alerts.output.alerts }}`',
        sizeParam: '`size`',
        alertsField: '`alerts`',
        apiConfigField: '`api_config`',
        typeField: '`type`',
        replacementsField: '`replacements`',
      },
    }),
    examples: [
      `## Basic generation with timeout
\`\`\`yaml
- name: generate_discoveries
  type: ${GenerateStepTypeId}
  timeout: '10m'  # Recommended: 10 minutes for complex analysis
  with:
    type: attack_discovery
    alerts: \${{ steps.retrieve_alerts.output.alerts }}
    api_config:
      action_type_id: '.gemini'
      connector_id: my-connector
      model: 'gemini-2.0-flash-exp'
\`\`\``,

      `## With size limit and replacements
\`\`\`yaml
- name: generate_discoveries
  type: ${GenerateStepTypeId}
  timeout: '10m'
  with:
    type: attack_discovery
    alerts: \${{ steps.retrieve_alerts.output.alerts }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    replacements: \${{ steps.retrieve_alerts.output.replacements }}
    size: 10  # Maximum number of discoveries to generate
\`\`\``,

      `## Full pipeline example
\`\`\`yaml
- name: retrieve_alerts
  type: attack-discovery.defaultAlertRetrieval
  with:
    alerts_index_pattern: '.alerts-security.alerts-default'
    size: 100
    start: 'now-24h'
    end: 'now'

- name: generate_discoveries
  type: ${GenerateStepTypeId}
  timeout: '10m'
  with:
    type: attack_discovery
    alerts: \${{ steps.retrieve_alerts.output.alerts }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    replacements: \${{ steps.retrieve_alerts.output.replacements }}

- name: validate_discoveries
  type: attack-discovery.defaultValidation
  with:
    attack_discoveries: \${{ steps.generate_discoveries.output.attack_discoveries }}
    anonymized_alerts: \${{ steps.retrieve_alerts.output.anonymized_alerts }}
\`\`\``,

      `## With additional context for focused analysis
\`\`\`yaml
- name: generate_discoveries
  type: ${GenerateStepTypeId}
  timeout: '10m'
  with:
    type: attack_discovery
    alerts: \${{ steps.retrieve_alerts.output.alerts }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    additional_context: >
      Focus on lateral movement and privilege escalation techniques.
      The environment uses Active Directory for identity management.
\`\`\``,

      `## Defend insights generation
\`\`\`yaml
- name: generate_insights
  type: ${GenerateStepTypeId}
  timeout: '10m'
  with:
    type: defend_insights
    alerts: \${{ steps.retrieve_alerts.output.alerts }}
    api_config:
      action_type_id: '.gen-ai'
      connector_id: my-openai-connector
\`\`\``,
    ],
  },
};

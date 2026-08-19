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
  CorrelateEntitiesStepCommonDefinition,
  CorrelateEntitiesStepTypeId,
} from '../../common/step_types/correlate_entities_step';
import { DefaultValidationStepTypeId } from '../../common/step_types/default_validation_step';
import { PersistDiscoveriesStepTypeId } from '../../common/step_types/persist_discoveries_step';

export const correlateEntitiesStepPublicDefinition: PublicStepDefinition = {
  ...CorrelateEntitiesStepCommonDefinition,

  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/users').then(({ icon }) => ({
      default: icon,
    }))
  ),

  documentation: {
    details: i18n.translate(
      'xpack.discoveries.workflowSteps.correlateEntities.documentation.details',
      {
        defaultMessage: `This step correlates Attack Discoveries with the Entity Store. For each discovery it derives the distinct user, host, and service entities across the discovery's alerts, looks them up in the Entity Store, and attaches the results to the discovery.

**Key Features:**
- Derives entity identifiers (EUIDs) from the discovery's alerts
- Matches EUIDs against the Entity Store; matches become {entitiesField}
- Unmatched values and extracted observables (IPs, file hashes, domains, and more) become {observableEntitiesField}
- Best-effort: on any failure, discoveries pass through unmodified

**Configuration:**
- {attackDiscoveries}: Array of discoveries to correlate (typically from the {validationStep} step output)
- {alertsIndexPattern}: Optional alerts index pattern (defaults to the space's security alerts index)

**Output:**
Returns the discoveries with {entitiesField} and {observableEntitiesField} attached, plus match counts.`,
        values: {
          alertsIndexPattern: '`alerts_index_pattern`',
          attackDiscoveries: '`attack_discoveries`',
          entitiesField: '`entities`',
          observableEntitiesField: '`observable_entities`',
          validationStep: '`attack-discovery.defaultValidation`',
        },
      }
    ),
    examples: [
      `## Correlate validated discoveries with the Entity Store
\`\`\`yaml
- name: correlate_entities
  type: ${CorrelateEntitiesStepTypeId}
  with:
    attack_discoveries: \${{ steps.validate_discoveries.output.validated_discoveries }}
\`\`\``,

      `## Validate, correlate, then persist
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

- name: correlate_entities
  type: ${CorrelateEntitiesStepTypeId}
  with:
    attack_discoveries: \${{ steps.validate_discoveries.output.validated_discoveries }}

- name: persist_discoveries
  type: ${PersistDiscoveriesStepTypeId}
  with:
    attack_discoveries: \${{ steps.correlate_entities.output.correlated_discoveries }}
    anonymized_alerts: \${{ steps.retrieve_alerts.output.anonymized_alerts }}
    replacements: \${{ steps.generate_discoveries.output.replacements }}
    api_config: \${{ steps.retrieve_alerts.output.api_config }}
    connector_name: \${{ steps.retrieve_alerts.output.connector_name }}
    generation_uuid: \${{ steps.generate_discoveries.output.execution_uuid }}
    alerts_context_count: \${{ steps.retrieve_alerts.output.alerts_context_count }}
\`\`\``,

      `## Correlate against a custom alerts index
\`\`\`yaml
- name: correlate_entities
  type: ${CorrelateEntitiesStepTypeId}
  with:
    alerts_index_pattern: '.alerts-security.alerts-default'
    attack_discoveries: \${{ steps.validate_discoveries.output.validated_discoveries }}
\`\`\``,
    ],
  },
};

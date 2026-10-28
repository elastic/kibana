/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuilderTypeDefinition } from '@kbn/alerting-v2-rule-builders';
import {
  thresholdBuilderFieldsSchema,
  type ThresholdBuilderFields,
} from '../../common/detection_rule_fields';
import { enrichDetectionRuleEvent } from './enrich_detection_rule_event';
import { generateThresholdQuery } from './threshold_generate_query';

// ---------------------------------------------------------------------------
// validateFields
//
// Rejects a cardinality.field that is also listed in threshold.field, because
// a distinct count over a grouping key is always trivially 1.
//
// Ref: rule-validation.md "The extra validation hook"
//      rule-execution-logic.md "security.detection.threshold"
// ---------------------------------------------------------------------------
export const validateThresholdFields = (fields: ThresholdBuilderFields): string[] => {
  const errors: string[] = [];
  const { field: groupingFields, cardinality } = fields.threshold;
  const cardinalityEntry = cardinality?.[0];
  if (cardinalityEntry !== undefined && groupingFields.includes(cardinalityEntry.field)) {
    errors.push(
      `cardinality.field "${cardinalityEntry.field}" is already listed in threshold.field; a distinct count over a grouping key is always 1`
    );
  }
  return errors;
};

// ---------------------------------------------------------------------------
// securityDetectionThreshold — the full BuilderTypeDefinition
//
// A registration carries no manifest: storage reaches the framework on its own
// path, through @kbn/security-detection-rule-builder-fields, and the type's
// schema is checked against those mappings at registration time.
//
// Properties:
//   type:         'security.detection.threshold'
//   name:         human-readable display name
//   kind:         'alert' — detection events are alert-kind (persistent-mode
//                 workaround; see alert-modes.md)
//   ownership:    managed by security/detection
//   compilation:  'execution_time' — query compiled on every run, never stored
//   validateFields: rejects overlapping cardinality/grouping field
//   generateQuery:  compiles the ES|QL breach query
//   enrichRuleEvent: stamps severity, risk_score, and signature_id
//
// deriveRuleFields is intentionally absent.  The STATS ... BY and the IS NOT NULL
// guards come from threshold.field directly, inside generateThresholdQuery.
// The framework's grouping field sits on top of those output rows and decides
// episode lifetime, not bucketing.  With deriveRuleFields dropped, the
// ungrouped fallback hash gives each output row its own episode, so one
// qualifying bucket produces one alert per run.
//
// Removing deriveRuleFields also removes a latent failure: an empty
// threshold.field would have produced grouping: { fields: [] }, which the
// saved-object schema rejects because it requires one to ten entries.
//
// Ref: rule-type-registration.md "What a registration declares"
//      builder-type-registration-redesign.md "The registration contract"
//      rule-execution-logic.md "security.detection.threshold"
//      rule-event-generation-logic.md "What the POC types stamp"
//      alert-modes.md "Configuring a persistent mode with what exists today"
// ---------------------------------------------------------------------------
export const securityDetectionThreshold: BuilderTypeDefinition<ThresholdBuilderFields> = {
  type: 'security.detection.threshold',
  name: 'Threshold',
  description:
    'Detects events that meet a count or cardinality threshold within a grouping of field values.',
  kind: 'alert',
  ownership: { solution: 'security', domain: 'detection' },
  compilation: 'execution_time',
  builderFieldsSchema: thresholdBuilderFieldsSchema,
  validateFields: validateThresholdFields,
  generateQuery: generateThresholdQuery,
  enrichRuleEvent: enrichDetectionRuleEvent,
};

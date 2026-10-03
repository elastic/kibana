/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import {
  MAX_ID_LENGTH,
  MAX_RULES_PER_TRIGGER,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_RULES_EVENT,
} from '../constants';
import {
  DETECTION_RULES_CREATED_SCHEMA_IDS_DESCRIPTION,
  DETECTION_RULES_CREATED_SCHEMA_SOURCE_DESCRIPTION,
  DETECTION_RULES_CREATED_SCHEMA_TAGS_DESCRIPTION,
  DETECTION_RULES_CREATED_SCHEMA_TOTAL_COUNT_DESCRIPTION,
  DETECTION_RULES_CREATED_SCHEMA_TYPES_DESCRIPTION,
  DETECTION_RULES_CREATED_TRIGGER_DESCRIPTION,
  DETECTION_RULES_CREATED_TRIGGER_DOCUMENTATION_DETAILS,
  DETECTION_RULES_CREATED_TRIGGER_TITLE,
} from '../translations';

export const DetectionRulesCreatedTriggerId = 'security.detectionRulesCreated' as const;

export const DETECTION_RULES_CREATED_SOURCE_VALUES = [
  'api',
  'import',
  'prebuilt_install',
  'duplicate',
  'siem_migration',
  'restore',
] as const;

export type DetectionRulesCreatedSource = (typeof DETECTION_RULES_CREATED_SOURCE_VALUES)[number];

const documentationExample1 = `## Run when a batch of created rules includes a machine learning rule
# event.types and event.tags describe the whole batch, so this runs for the batch even if only
# some of its rules are machine learning rules. Check each rule in event.ids if that matters.
\`\`\`yaml
triggers:
  - type: security.detectionRulesCreated
    on:
      condition: 'event.types: "machine_learning"'
\`\`\``;

const documentationExample2 = `## Process each created rule sequentially
\`\`\`yaml
triggers:
  - type: security.detectionRulesCreated
steps:
  - name: process_each_rule
    type: foreach
    foreach: "{{ event.ids | json }}"
    steps:
      - name: log_rule
        type: console
        with:
          message: "Created rule {{ foreach.item }}"
\`\`\``;

// Flat arrays rather than an array of rule objects: KQL conditions cannot match fields inside an
// array of objects, so per-rule objects would make the event impossible to filter.
// `types` is not an enum: a new rule type must not make the whole event fail validation, because a
// rejected event is dropped and its rules never reach the workflows subscribed to the trigger.
const detectionRulesCreatedEventSchema = z.object({
  ids: z
    .array(z.string().min(1).max(MAX_ID_LENGTH))
    .min(1)
    .max(MAX_RULES_PER_TRIGGER)
    .meta({ description: DETECTION_RULES_CREATED_SCHEMA_IDS_DESCRIPTION }),
  types: z
    .array(z.string().min(1).max(MAX_ID_LENGTH))
    .min(1)
    .max(MAX_RULES_PER_TRIGGER)
    .meta({ description: DETECTION_RULES_CREATED_SCHEMA_TYPES_DESCRIPTION }),
  tags: z
    .array(z.string().max(MAX_TAG_LENGTH))
    .max(MAX_TAGS_PER_RULES_EVENT)
    .meta({ description: DETECTION_RULES_CREATED_SCHEMA_TAGS_DESCRIPTION }),
  totalCount: z
    .number()
    .int()
    .min(1)
    .meta({ description: DETECTION_RULES_CREATED_SCHEMA_TOTAL_COUNT_DESCRIPTION }),
  source: z
    .enum(DETECTION_RULES_CREATED_SOURCE_VALUES)
    .optional()
    .meta({ description: DETECTION_RULES_CREATED_SCHEMA_SOURCE_DESCRIPTION }),
});

export const detectionRulesCreatedTriggerDef: CommonTriggerDefinition = {
  id: DetectionRulesCreatedTriggerId,
  stability: 'tech_preview',
  eventSchema: detectionRulesCreatedEventSchema,
  title: DETECTION_RULES_CREATED_TRIGGER_TITLE,
  description: DETECTION_RULES_CREATED_TRIGGER_DESCRIPTION,
  documentation: {
    details: DETECTION_RULES_CREATED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample1, documentationExample2],
  },
};

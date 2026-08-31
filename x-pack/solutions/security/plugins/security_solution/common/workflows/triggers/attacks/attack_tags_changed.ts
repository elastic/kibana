/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_ID_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_OPERATION,
} from '../constants';
import {
  ATTACK_TAGS_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION,
  ATTACK_TAGS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION,
  ATTACK_TAGS_CHANGED_TRIGGER_DESCRIPTION,
  ATTACK_TAGS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
  ATTACK_TAGS_CHANGED_TRIGGER_TITLE,
  TRIGGER_SCHEMA_TAGS_TO_ADD_DESCRIPTION,
  TRIGGER_SCHEMA_TAGS_TO_REMOVE_DESCRIPTION,
} from '../translations';

export const AttackTagsChangedTriggerId = 'security.attackTagsChanged' as const;

const documentationExample = `## Run when a tag is added to attacks
\`\`\`yaml
triggers:
  - type: security.attackTagsChanged
    on:
      condition: 'event.tagsToAdd: "escalated"'
\`\`\``;

const attackTagsChangedEventSchema = z.object({
  attackIds: z
    .array(z.string().min(1).max(MAX_ID_LENGTH))
    .max(MAX_ALERTS_PER_TRIGGER)
    .meta({ description: ATTACK_TAGS_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION }),
  tagsToAdd: z
    .array(z.string().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS_PER_OPERATION)
    .meta({ description: TRIGGER_SCHEMA_TAGS_TO_ADD_DESCRIPTION }),
  tagsToRemove: z
    .array(z.string().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS_PER_OPERATION)
    .meta({ description: TRIGGER_SCHEMA_TAGS_TO_REMOVE_DESCRIPTION }),
  truncated: z.boolean().meta({ description: ATTACK_TAGS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION }),
});

export const attackTagsChangedTriggerDef: CommonTriggerDefinition = {
  id: AttackTagsChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: attackTagsChangedEventSchema,
  title: ATTACK_TAGS_CHANGED_TRIGGER_TITLE,
  description: ATTACK_TAGS_CHANGED_TRIGGER_DESCRIPTION,
  documentation: {
    details: ATTACK_TAGS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample],
  },
};

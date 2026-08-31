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
  ALERT_TAGS_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION,
  ALERT_TAGS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION,
  ALERT_TAGS_CHANGED_TRIGGER_DESCRIPTION,
  ALERT_TAGS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
  ALERT_TAGS_CHANGED_TRIGGER_TITLE,
  TRIGGER_SCHEMA_TAGS_TO_ADD_DESCRIPTION,
  TRIGGER_SCHEMA_TAGS_TO_REMOVE_DESCRIPTION,
} from '../translations';

export const AlertTagsChangedTriggerId = 'security.alertTagsChanged' as const;

const documentationExample = `## Run when a specific tag is added
\`\`\`yaml
triggers:
  - type: security.alertTagsChanged
    on:
      condition: 'event.tagsToAdd: "high-priority"'
\`\`\``;

const alertTagsChangedEventSchema = z.object({
  alertIds: z
    .array(z.string().min(1).max(MAX_ID_LENGTH))
    .max(MAX_ALERTS_PER_TRIGGER)
    .meta({ description: ALERT_TAGS_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION }),
  tagsToAdd: z
    .array(z.string().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS_PER_OPERATION)
    .meta({ description: TRIGGER_SCHEMA_TAGS_TO_ADD_DESCRIPTION }),
  tagsToRemove: z
    .array(z.string().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS_PER_OPERATION)
    .meta({ description: TRIGGER_SCHEMA_TAGS_TO_REMOVE_DESCRIPTION }),
  truncated: z.boolean().meta({ description: ALERT_TAGS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION }),
});

export const alertTagsChangedTriggerDef: CommonTriggerDefinition = {
  id: AlertTagsChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertTagsChangedEventSchema,
  title: ALERT_TAGS_CHANGED_TRIGGER_TITLE,
  description: ALERT_TAGS_CHANGED_TRIGGER_DESCRIPTION,
  documentation: {
    details: ALERT_TAGS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample],
  },
};

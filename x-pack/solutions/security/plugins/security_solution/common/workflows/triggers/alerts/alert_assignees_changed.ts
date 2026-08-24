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
  MAX_ASSIGNEE_UID_LENGTH,
  MAX_ASSIGNEES_PER_OPERATION,
  MAX_ID_LENGTH,
} from '../constants';
import {
  ALERT_ASSIGNEES_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION,
  ALERT_ASSIGNEES_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION,
  ALERT_ASSIGNEES_CHANGED_TRIGGER_DESCRIPTION,
  ALERT_ASSIGNEES_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
  ALERT_ASSIGNEES_CHANGED_TRIGGER_TITLE,
  TRIGGER_SCHEMA_ASSIGNEES_TO_ADD_DESCRIPTION,
  TRIGGER_SCHEMA_ASSIGNEES_TO_REMOVE_DESCRIPTION,
} from '../translations';

export const AlertAssigneesChangedTriggerId = 'security.alertAssigneesChanged' as const;

const documentationExample = `## Run when an alert is assigned
\`\`\`yaml
triggers:
  - type: security.alertAssigneesChanged
    on:
      condition: 'event.assigneesToAdd: *'
\`\`\``;

const alertAssigneesChangedEventSchema = z.object({
  alertIds: z
    .array(z.string().min(1).max(MAX_ID_LENGTH))
    .max(MAX_ALERTS_PER_TRIGGER)
    .meta({ description: ALERT_ASSIGNEES_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION }),
  assigneesToAdd: z
    .array(z.string().min(1).max(MAX_ASSIGNEE_UID_LENGTH))
    .max(MAX_ASSIGNEES_PER_OPERATION)
    .meta({ description: TRIGGER_SCHEMA_ASSIGNEES_TO_ADD_DESCRIPTION }),
  assigneesToRemove: z
    .array(z.string().min(1).max(MAX_ASSIGNEE_UID_LENGTH))
    .max(MAX_ASSIGNEES_PER_OPERATION)
    .meta({ description: TRIGGER_SCHEMA_ASSIGNEES_TO_REMOVE_DESCRIPTION }),
  truncated: z
    .boolean()
    .meta({ description: ALERT_ASSIGNEES_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION }),
});

export const alertAssigneesChangedTriggerDef: CommonTriggerDefinition = {
  id: AlertAssigneesChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertAssigneesChangedEventSchema,
  title: ALERT_ASSIGNEES_CHANGED_TRIGGER_TITLE,
  description: ALERT_ASSIGNEES_CHANGED_TRIGGER_DESCRIPTION,
  documentation: {
    details: ALERT_ASSIGNEES_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample],
  },
};

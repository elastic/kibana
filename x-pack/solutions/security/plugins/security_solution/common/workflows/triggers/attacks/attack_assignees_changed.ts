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
  ATTACK_ASSIGNEES_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION,
  ATTACK_ASSIGNEES_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION,
  ATTACK_ASSIGNEES_CHANGED_TRIGGER_DESCRIPTION,
  ATTACK_ASSIGNEES_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
  ATTACK_ASSIGNEES_CHANGED_TRIGGER_TITLE,
  TRIGGER_SCHEMA_ASSIGNEES_TO_ADD_DESCRIPTION,
  TRIGGER_SCHEMA_ASSIGNEES_TO_REMOVE_DESCRIPTION,
} from '../translations';

export const AttackAssigneesChangedTriggerId = 'security.attackAssigneesChanged' as const;

const documentationExample = `## Run when an attack is assigned
\`\`\`yaml
triggers:
  - type: security.attackAssigneesChanged
    on:
      condition: 'event.assigneesToAdd: *'
\`\`\``;

const attackAssigneesChangedEventSchema = z.object({
  attackIds: z
    .array(z.string().min(1).max(MAX_ID_LENGTH))
    .max(MAX_ALERTS_PER_TRIGGER)
    .meta({ description: ATTACK_ASSIGNEES_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION }),
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
    .meta({ description: ATTACK_ASSIGNEES_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION }),
});

export const attackAssigneesChangedTriggerDef: CommonTriggerDefinition = {
  id: AttackAssigneesChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: attackAssigneesChangedEventSchema,
  title: ATTACK_ASSIGNEES_CHANGED_TRIGGER_TITLE,
  description: ATTACK_ASSIGNEES_CHANGED_TRIGGER_DESCRIPTION,
  documentation: {
    details: ATTACK_ASSIGNEES_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample],
  },
};

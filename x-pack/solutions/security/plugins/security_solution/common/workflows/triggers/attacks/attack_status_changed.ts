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
  previousStatusSchema,
  workflowStatusEnum,
} from '../constants';
import {
  ATTACK_STATUS_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION,
  ATTACK_STATUS_CHANGED_SCHEMA_PREVIOUS_STATUSES_DESCRIPTION,
  ATTACK_STATUS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION,
  ATTACK_STATUS_CHANGED_TRIGGER_DESCRIPTION,
  ATTACK_STATUS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
  ATTACK_STATUS_CHANGED_TRIGGER_TITLE,
  TRIGGER_SCHEMA_STATUS_DESCRIPTION,
} from '../translations';

export const AttackStatusChangedTriggerId = 'security.attackStatusChanged' as const;

const documentationExample = `## Run when attacks are acknowledged
\`\`\`yaml
triggers:
  - type: security.attackStatusChanged
    on:
      condition: 'event.status: "acknowledged"'
\`\`\``;

const attackStatusChangedEventSchema = z.object({
  attackIds: z
    .array(z.string().min(1).max(MAX_ID_LENGTH))
    .max(MAX_ALERTS_PER_TRIGGER)
    .meta({ description: ATTACK_STATUS_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION }),
  status: workflowStatusEnum.meta({ description: TRIGGER_SCHEMA_STATUS_DESCRIPTION }),
  previousStatuses: z
    .array(previousStatusSchema)
    .max(MAX_ALERTS_PER_TRIGGER)
    .meta({ description: ATTACK_STATUS_CHANGED_SCHEMA_PREVIOUS_STATUSES_DESCRIPTION }),
  truncated: z.boolean().meta({ description: ATTACK_STATUS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION }),
});

export const attackStatusChangedTriggerDef: CommonTriggerDefinition = {
  id: AttackStatusChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: attackStatusChangedEventSchema,
  title: ATTACK_STATUS_CHANGED_TRIGGER_TITLE,
  description: ATTACK_STATUS_CHANGED_TRIGGER_DESCRIPTION,
  documentation: {
    details: ATTACK_STATUS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample],
  },
};

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
  MAX_SPACE_ID_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_OPERATION,
} from './constants';
import {
  ATTACK_TAGS_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION,
  ATTACK_TAGS_CHANGED_TRIGGER_DESCRIPTION,
  ATTACK_TAGS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
  ATTACK_TAGS_CHANGED_TRIGGER_DOCUMENTATION_EXAMPLE,
  ATTACK_TAGS_CHANGED_TRIGGER_TITLE,
  TRIGGER_SCHEMA_SPACE_ID_DESCRIPTION,
  TRIGGER_SCHEMA_TAGS_TO_ADD_DESCRIPTION,
  TRIGGER_SCHEMA_TAGS_TO_REMOVE_DESCRIPTION,
} from './translations';

export const AttackTagsChangedTriggerId = 'securitySolution.attackTagsChanged' as const;

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
  spaceId: z
    .string()
    .min(1)
    .max(MAX_SPACE_ID_LENGTH)
    .meta({ description: TRIGGER_SCHEMA_SPACE_ID_DESCRIPTION }),
});

export const attackTagsChangedTriggerDef: CommonTriggerDefinition = {
  id: AttackTagsChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: attackTagsChangedEventSchema,
  title: ATTACK_TAGS_CHANGED_TRIGGER_TITLE,
  description: ATTACK_TAGS_CHANGED_TRIGGER_DESCRIPTION,
  documentation: {
    details: ATTACK_TAGS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [ATTACK_TAGS_CHANGED_TRIGGER_DOCUMENTATION_EXAMPLE],
  },
};

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
  MAX_NOTE_CONTENT_LENGTH,
  MAX_SPACE_ID_LENGTH,
  MAX_USERNAME_LENGTH,
} from './constants';
import {
  NOTE_CREATED_SCHEMA_CREATED_BY_DESCRIPTION,
  NOTE_CREATED_SCHEMA_DOCUMENT_ID_DESCRIPTION,
  NOTE_CREATED_SCHEMA_NOTE_CONTENT_DESCRIPTION,
  NOTE_CREATED_SCHEMA_NOTE_ID_DESCRIPTION,
  NOTE_CREATED_TRIGGER_DESCRIPTION,
  NOTE_CREATED_TRIGGER_DOCUMENTATION_DETAILS,
  NOTE_CREATED_TRIGGER_DOCUMENTATION_EXAMPLE,
  NOTE_CREATED_TRIGGER_TITLE,
  TRIGGER_SCHEMA_SPACE_ID_DESCRIPTION,
} from './translations';

export const NoteCreatedTriggerId = 'securitySolution.noteCreated' as const;

const noteCreatedEventSchema = z.object({
  noteId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .meta({ description: NOTE_CREATED_SCHEMA_NOTE_ID_DESCRIPTION }),
  noteContent: z
    .string()
    .min(1)
    .max(MAX_NOTE_CONTENT_LENGTH)
    .meta({ description: NOTE_CREATED_SCHEMA_NOTE_CONTENT_DESCRIPTION }),
  createdBy: z
    .string()
    .min(1)
    .max(MAX_USERNAME_LENGTH)
    .meta({ description: NOTE_CREATED_SCHEMA_CREATED_BY_DESCRIPTION }),
  documentId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .meta({ description: NOTE_CREATED_SCHEMA_DOCUMENT_ID_DESCRIPTION }),
  spaceId: z
    .string()
    .min(1)
    .max(MAX_SPACE_ID_LENGTH)
    .meta({ description: TRIGGER_SCHEMA_SPACE_ID_DESCRIPTION }),
});

export const noteCreatedTriggerDef: CommonTriggerDefinition = {
  id: NoteCreatedTriggerId,
  stability: 'tech_preview',
  eventSchema: noteCreatedEventSchema,
  title: NOTE_CREATED_TRIGGER_TITLE,
  description: NOTE_CREATED_TRIGGER_DESCRIPTION,
  documentation: {
    details: NOTE_CREATED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [NOTE_CREATED_TRIGGER_DOCUMENTATION_EXAMPLE],
  },
};

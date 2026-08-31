/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { MAX_ID_LENGTH, MAX_USERNAME_LENGTH } from '../constants';
import {
  NOTE_UPDATED_SCHEMA_DOCUMENT_ID_DESCRIPTION,
  NOTE_UPDATED_SCHEMA_NOTE_ID_DESCRIPTION,
  NOTE_UPDATED_SCHEMA_UPDATED_BY_DESCRIPTION,
  NOTE_UPDATED_TRIGGER_DESCRIPTION,
  NOTE_UPDATED_TRIGGER_DOCUMENTATION_DETAILS,
  NOTE_UPDATED_TRIGGER_TITLE,
} from '../translations';

export const NoteUpdatedTriggerId = 'security.noteUpdated' as const;

const documentationExample = `## Run whenever a note is updated on a document
\`\`\`yaml
triggers:
  - type: security.noteUpdated
\`\`\``;

const noteUpdatedEventSchema = z.object({
  noteId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .meta({ description: NOTE_UPDATED_SCHEMA_NOTE_ID_DESCRIPTION }),
  updatedBy: z
    .string()
    .min(1)
    .max(MAX_USERNAME_LENGTH)
    .meta({ description: NOTE_UPDATED_SCHEMA_UPDATED_BY_DESCRIPTION }),
  documentId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .meta({ description: NOTE_UPDATED_SCHEMA_DOCUMENT_ID_DESCRIPTION }),
});

export const noteUpdatedTriggerDef: CommonTriggerDefinition = {
  id: NoteUpdatedTriggerId,
  stability: 'tech_preview',
  eventSchema: noteUpdatedEventSchema,
  title: NOTE_UPDATED_TRIGGER_TITLE,
  description: NOTE_UPDATED_TRIGGER_DESCRIPTION,
  documentation: {
    details: NOTE_UPDATED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample],
  },
};

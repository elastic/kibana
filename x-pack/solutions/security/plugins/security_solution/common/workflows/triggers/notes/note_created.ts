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
  NOTE_CREATED_SCHEMA_CREATED_BY_DESCRIPTION,
  NOTE_CREATED_SCHEMA_DOCUMENT_ID_DESCRIPTION,
  NOTE_CREATED_SCHEMA_NOTE_ID_DESCRIPTION,
  NOTE_CREATED_TRIGGER_DESCRIPTION,
  NOTE_CREATED_TRIGGER_DOCUMENTATION_DETAILS,
  NOTE_CREATED_TRIGGER_TITLE,
} from '../translations';

export const NoteCreatedTriggerId = 'security.noteCreated' as const;

const documentationExample = `## Run whenever a note is added to a document
\`\`\`yaml
triggers:
  - type: security.noteCreated
\`\`\``;

const noteCreatedEventSchema = z.object({
  noteId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .meta({ description: NOTE_CREATED_SCHEMA_NOTE_ID_DESCRIPTION }),
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
});

export const noteCreatedTriggerDef: CommonTriggerDefinition = {
  id: NoteCreatedTriggerId,
  stability: 'tech_preview',
  eventSchema: noteCreatedEventSchema,
  title: NOTE_CREATED_TRIGGER_TITLE,
  description: NOTE_CREATED_TRIGGER_DESCRIPTION,
  documentation: {
    details: NOTE_CREATED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample],
  },
};

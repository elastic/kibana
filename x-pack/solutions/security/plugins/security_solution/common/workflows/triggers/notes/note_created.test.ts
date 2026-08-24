/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noteCreatedTriggerDef, NoteCreatedTriggerId } from './note_created';

const schema = noteCreatedTriggerDef.eventSchema;

describe('noteCreated trigger', () => {
  it('has the correct id', () => {
    expect(noteCreatedTriggerDef.id).toBe(NoteCreatedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(noteCreatedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() =>
      schema.parse({
        noteId: 'n1',
        noteContent: 'text',
        createdBy: 'user',
        documentId: 'doc-1',
        spaceId: 'default',
      })
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => schema.parse({ noteId: 'n1' })).toThrow();
  });
});

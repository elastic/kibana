/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noteUpdatedTriggerDef, NoteUpdatedTriggerId } from './note_updated';

const schema = noteUpdatedTriggerDef.eventSchema;

describe('noteUpdated trigger', () => {
  it('has the correct id', () => {
    expect(noteUpdatedTriggerDef.id).toBe(NoteUpdatedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(noteUpdatedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() =>
      schema.parse({
        noteId: 'n1',
        noteContent: 'updated text',
        updatedBy: 'user',
        documentId: 'doc-1',
        spaceId: 'default',
      })
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => schema.parse({ noteId: 'n1' })).toThrow();
  });
});

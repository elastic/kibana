/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertStatusChangedTriggerDef,
  AlertStatusChangedTriggerId,
  alertTagsChangedTriggerDef,
  AlertTagsChangedTriggerId,
  alertAssigneesChangedTriggerDef,
  AlertAssigneesChangedTriggerId,
  attackStatusChangedTriggerDef,
  AttackStatusChangedTriggerId,
  attackTagsChangedTriggerDef,
  AttackTagsChangedTriggerId,
  attackAssigneesChangedTriggerDef,
  AttackAssigneesChangedTriggerId,
  noteCreatedTriggerDef,
  NoteCreatedTriggerId,
  noteUpdatedTriggerDef,
  NoteUpdatedTriggerId,
} from '.';

describe('Security Solution workflow trigger definitions', () => {
  const allDefs = [
    { def: alertStatusChangedTriggerDef, id: AlertStatusChangedTriggerId },
    { def: alertTagsChangedTriggerDef, id: AlertTagsChangedTriggerId },
    { def: alertAssigneesChangedTriggerDef, id: AlertAssigneesChangedTriggerId },
    { def: attackStatusChangedTriggerDef, id: AttackStatusChangedTriggerId },
    { def: attackTagsChangedTriggerDef, id: AttackTagsChangedTriggerId },
    { def: attackAssigneesChangedTriggerDef, id: AttackAssigneesChangedTriggerId },
    { def: noteCreatedTriggerDef, id: NoteCreatedTriggerId },
    { def: noteUpdatedTriggerDef, id: NoteUpdatedTriggerId },
  ];

  describe.each(allDefs)('$def.id', ({ def, id }) => {
    it('has the correct id', () => {
      expect(def.id).toBe(id);
    });

    it('has a non-empty title', () => {
      expect(def.title).toBeTruthy();
    });

    it('has a non-empty description', () => {
      expect(def.description).toBeTruthy();
    });

    it('has stability set to tech_preview', () => {
      expect(def.stability).toBe('tech_preview');
    });

    it('has an eventSchema', () => {
      expect(def.eventSchema).toBeDefined();
    });
  });

  describe('alertStatusChanged schema', () => {
    const schema = alertStatusChangedTriggerDef.eventSchema;

    it('accepts a valid payload', () => {
      expect(() =>
        schema.parse({
          alertIds: ['alert-1', 'alert-2'],
          status: 'acknowledged',
          previousStatuses: [{ id: 'alert-1', previousStatus: 'open' }],
          truncated: false,
          spaceId: 'default',
        })
      ).not.toThrow();
    });

    it('rejects an invalid status value', () => {
      expect(() =>
        schema.parse({
          alertIds: [],
          status: 'invalid-status',
          previousStatuses: [],
          truncated: false,
          spaceId: 'default',
        })
      ).toThrow();
    });

    it('rejects an invalid previousStatus value', () => {
      expect(() =>
        schema.parse({
          alertIds: [],
          status: 'open',
          previousStatuses: [{ id: 'a', previousStatus: 'not-a-status' }],
          truncated: false,
          spaceId: 'default',
        })
      ).toThrow();
    });

    it('rejects missing required fields', () => {
      expect(() => schema.parse({ alertIds: [] })).toThrow();
    });
  });

  describe('alertTagsChanged schema', () => {
    const schema = alertTagsChangedTriggerDef.eventSchema;

    it('accepts a valid payload', () => {
      expect(() =>
        schema.parse({
          alertIds: ['a'],
          tagsToAdd: ['t1'],
          tagsToRemove: [],
          spaceId: 'default',
        })
      ).not.toThrow();
    });

    it('rejects missing required fields', () => {
      expect(() => schema.parse({ alertIds: [] })).toThrow();
    });
  });

  describe('alertAssigneesChanged schema', () => {
    const schema = alertAssigneesChangedTriggerDef.eventSchema;

    it('accepts a valid payload', () => {
      expect(() =>
        schema.parse({
          alertIds: ['a'],
          assigneesToAdd: ['uid1'],
          assigneesToRemove: [],
          spaceId: 'default',
        })
      ).not.toThrow();
    });

    it('rejects missing required fields', () => {
      expect(() => schema.parse({ alertIds: [] })).toThrow();
    });
  });

  describe('attackStatusChanged schema', () => {
    const schema = attackStatusChangedTriggerDef.eventSchema;

    it('accepts a valid payload', () => {
      expect(() =>
        schema.parse({
          attackIds: ['a'],
          status: 'closed',
          previousStatuses: [{ id: 'a', previousStatus: 'open' }],
          spaceId: 'default',
        })
      ).not.toThrow();
    });

    it('rejects an invalid status value', () => {
      expect(() =>
        schema.parse({
          attackIds: [],
          status: 'invalid',
          previousStatuses: [],
          spaceId: 'default',
        })
      ).toThrow();
    });

    it('rejects missing required fields', () => {
      expect(() => schema.parse({ attackIds: [] })).toThrow();
    });
  });

  describe('attackTagsChanged schema', () => {
    const schema = attackTagsChangedTriggerDef.eventSchema;

    it('accepts a valid payload', () => {
      expect(() =>
        schema.parse({
          attackIds: ['a'],
          tagsToAdd: ['t'],
          tagsToRemove: [],
          spaceId: 'default',
        })
      ).not.toThrow();
    });

    it('rejects missing required fields', () => {
      expect(() => schema.parse({ attackIds: [] })).toThrow();
    });
  });

  describe('attackAssigneesChanged schema', () => {
    const schema = attackAssigneesChangedTriggerDef.eventSchema;

    it('accepts a valid payload', () => {
      expect(() =>
        schema.parse({
          attackIds: ['a'],
          assigneesToAdd: ['uid'],
          assigneesToRemove: [],
          spaceId: 'default',
        })
      ).not.toThrow();
    });

    it('rejects missing required fields', () => {
      expect(() => schema.parse({ attackIds: [] })).toThrow();
    });
  });

  describe('noteCreated schema', () => {
    const schema = noteCreatedTriggerDef.eventSchema;

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

  describe('noteUpdated schema', () => {
    const schema = noteUpdatedTriggerDef.eventSchema;

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
});

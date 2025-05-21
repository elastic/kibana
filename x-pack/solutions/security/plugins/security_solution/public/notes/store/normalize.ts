/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Note } from '../../../common/api/timeline';

/**
 * Interface to represent a normalized entity
 */
export interface NormalizedEntity<T> {
  entities: {
    [entity: string]: {
      [id: string]: T;
    };
  };
  result: string;
}

/**
 * Interface to represent normalized entities
 */
export interface NormalizedEntities<T> {
  entities: {
    [entity: string]: {
      [id: string]: T;
    };
  };
  result: string[];
}

/**
 * Normalizes a single note
 */
export const normalizeEntity = (res: Note): NormalizedEntity<Note> => ({
  entities: {
    notes: {
      [res.noteId]: res,
    },
  },
  result: res.noteId,
});

/**
 * Normalizes an array of notes
 */
export const normalizeEntities = (res: Note[]): NormalizedEntities<Note> => ({
  entities: {
    notes: res.reduce((obj, item) => Object.assign(obj, { [item.noteId]: item }), {}),
  },
  result: res.map((note) => note.noteId),
});

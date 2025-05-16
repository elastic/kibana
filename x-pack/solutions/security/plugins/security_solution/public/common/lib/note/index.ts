/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Users create notes to document their work and communicate with other analysts */
export interface Note {
  /** When the note was created */
  created: Date;
  eventId?: string | null;
  /** Uniquely identifies the note */
  id: string;
  /** When not `null`, this represents the last edit   */
  lastEdit: Date | null;
  /** The contents of the note */
  note: string;
  /** The user who created the note */
  user: string;
  /** SaveObjectID for note */
  saveObjectId: string | null | undefined;
  timelineId?: string | null;
  version: string | null | undefined;
}

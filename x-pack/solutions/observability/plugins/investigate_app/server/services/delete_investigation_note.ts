/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { InvestigationRepository } from './investigation_repository';

export async function deleteInvestigationNote(
  investigationId: string,
  noteId: string,
  { repository, user }: { repository: InvestigationRepository; user: AuthenticatedUser }
): Promise<void> {
  const investigation = await repository.findById(investigationId);
  const note = investigation.notes.find((currNote) => currNote.id === noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  if (note.createdBy !== user.profile_uid) {
    throw new Error('User does not have permission to delete note');
  }

  investigation.notes = investigation.notes.filter((currNote) => currNote.id !== noteId);
  await repository.save(investigation);
}
